"""Sandbox Runner: Isolated workspace management, git diff application, and pytest execution."""

import os
import sys
import shutil
import tempfile
import asyncio
import difflib
import logging
from typing import Dict, Any, List, Optional, Tuple
from pathlib import Path
from backend.config import settings

logger = logging.getLogger("patchforge.sandbox")

DEMO_REPOS_ROOT = Path(__file__).resolve().parent.parent / "demo_repos"


class SandboxExecutionResult:
    """Execution output from isolated test run."""

    def __init__(
        self,
        success: bool,
        returncode: int,
        stdout: str,
        stderr: str,
        failed_tests: List[str],
        duration_sec: float,
        workspace_dir: str,
    ):
        self.success = success
        self.returncode = returncode
        self.stdout = stdout
        self.stderr = stderr
        self.failed_tests = failed_tests
        self.duration_sec = duration_sec
        self.workspace_dir = workspace_dir

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "returncode": self.returncode,
            "stdout": self.stdout,
            "stderr": self.stderr,
            "failed_tests": self.failed_tests,
            "duration_sec": round(self.duration_sec, 2),
            "workspace_dir": self.workspace_dir,
        }


class SandboxRunner:
    """Executes tests and patches inside isolated workspaces."""

    async def create_workspace(self, target: str) -> str:
        """Create a fresh temporary directory populated with code from scenario or Git URL."""
        temp_dir = tempfile.mkdtemp(prefix="patchforge_run_")

        # Case 1: Built-in judge scenario (supports all 4 domain architectures)
        if target.startswith("scenario:") or target in (
            "repo_1_pydantic_v2",
            "repo_2_fastapi_lifespan",
            "repo_3_cve_security",
            "repo_4_document_pipeline",
        ):
            scenario_name = target.replace("scenario:", "").strip()
            source_dir = DEMO_REPOS_ROOT / scenario_name
            if not source_dir.exists():
                raise FileNotFoundError(f"Scenario directory {source_dir} does not exist")
            shutil.copytree(str(source_dir), temp_dir, dirs_exist_ok=True)
            logger.info("Created isolated workspace for %s at %s", scenario_name, temp_dir)
            return temp_dir

        # Case 2: Git repository URL
        if target.startswith("http://") or target.startswith("https://") or target.startswith("git@"):
            logger.info("Cloning repository %s into %s", target, temp_dir)
            proc = await asyncio.create_subprocess_exec(
                "git",
                "clone",
                "--depth",
                "1",
                target,
                temp_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await proc.communicate()
            if proc.returncode != 0:
                shutil.rmtree(temp_dir, ignore_errors=True)
                raise RuntimeError(f"Git clone failed: {stderr.decode('utf-8')}")
            return temp_dir

        # Case 3: Local directory path
        if os.path.isdir(target):
            shutil.copytree(target, temp_dir, dirs_exist_ok=True)
            return temp_dir

        default_dir = DEMO_REPOS_ROOT / "repo_1_pydantic_v2"
        shutil.copytree(str(default_dir), temp_dir, dirs_exist_ok=True)
        return temp_dir

    async def run_tests(self, workspace_dir: str, timeout_sec: Optional[int] = None) -> SandboxExecutionResult:
        """Run pytest in the isolated workspace with timeout and sanitized env."""
        timeout = timeout_sec or settings.sandbox_timeout_seconds
        start_time = asyncio.get_event_loop().time()

        env = {
            "PATH": os.environ.get("PATH", ""),
            "PYTHONPATH": workspace_dir,
            "PYTHONDONTWRITEBYTECODE": "1",
            "PYTHONUNBUFFERED": "1",
            "HOME": os.environ.get("HOME", "/tmp"),
            "LANG": "en_US.UTF-8",
        }
        if "VIRTUAL_ENV" in os.environ:
            env["VIRTUAL_ENV"] = os.environ["VIRTUAL_ENV"]

        cmd = [sys.executable, "-m", "pytest", "-v", "--tb=short"]

        try:
            process = await asyncio.create_subprocess_exec(
                *cmd,
                cwd=workspace_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                env=env,
            )

            try:
                stdout_bytes, stderr_bytes = await asyncio.wait_for(process.communicate(), timeout=timeout)
                duration = asyncio.get_event_loop().time() - start_time
                stdout = stdout_bytes.decode("utf-8", errors="replace")
                stderr = stderr_bytes.decode("utf-8", errors="replace")
                returncode = process.returncode or 0

                failed_tests = self._parse_failed_tests(stdout + "\n" + stderr)

                return SandboxExecutionResult(
                    success=(returncode == 0),
                    returncode=returncode,
                    stdout=stdout,
                    stderr=stderr,
                    failed_tests=failed_tests,
                    duration_sec=duration,
                    workspace_dir=workspace_dir,
                )

            except asyncio.TimeoutError:
                try:
                    process.kill()
                    await process.wait()
                except Exception:
                    pass
                duration = asyncio.get_event_loop().time() - start_time
                return SandboxExecutionResult(
                    success=False,
                    returncode=-1,
                    stdout="",
                    stderr=f"Test run exceeded timeout of {timeout} seconds",
                    failed_tests=["TIMEOUT_ERROR"],
                    duration_sec=duration,
                    workspace_dir=workspace_dir,
                )

        except Exception as e:
            duration = asyncio.get_event_loop().time() - start_time
            return SandboxExecutionResult(
                success=False,
                returncode=1,
                stdout="",
                stderr=f"Failed to execute pytest: {str(e)}",
                failed_tests=["EXECUTION_ERROR"],
                duration_sec=duration,
                workspace_dir=workspace_dir,
            )

    def _parse_failed_tests(self, output: str) -> List[str]:
        failed = []
        for line in output.splitlines():
            line = line.strip()
            if line.startswith("FAILED ") and "::" in line:
                test_name = line.split()[1]
                failed.append(test_name)
        return failed

    def read_workspace_files(self, workspace_dir: str) -> Dict[str, str]:
        files = {}
        for root, _, filenames in os.walk(workspace_dir):
            for fname in sorted(filenames):
                if fname.endswith((".py", ".json", ".yaml", ".yml")):
                    full_path = os.path.join(root, fname)
                    rel_path = os.path.relpath(full_path, workspace_dir)
                    try:
                        with open(full_path, "r", encoding="utf-8") as f:
                            files[rel_path] = f.read()
                    except Exception as e:
                        logger.warning("Could not read file %s: %s", rel_path, str(e))
        return files

    def apply_patch(
        self, workspace_dir: str, files_to_update: Dict[str, str]
    ) -> Tuple[bool, Dict[str, str], str]:
        diffs = {}
        combined_diff_lines = []

        for rel_path, new_content in files_to_update.items():
            full_path = os.path.join(workspace_dir, rel_path)
            orig_content = ""
            if os.path.exists(full_path):
                with open(full_path, "r", encoding="utf-8") as f:
                    orig_content = f.read()

            orig_lines = orig_content.splitlines(keepends=True)
            new_lines = new_content.splitlines(keepends=True)
            diff = list(
                difflib.unified_diff(
                    orig_lines,
                    new_lines,
                    fromfile=f"a/{rel_path}",
                    tofile=f"b/{rel_path}",
                    n=3,
                )
            )
            diff_text = "".join(diff)
            diffs[rel_path] = diff_text
            combined_diff_lines.append(diff_text)

            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(new_content)

        return True, diffs, "\n".join(combined_diff_lines)

    def cleanup(self, workspace_dir: str):
        try:
            if os.path.exists(workspace_dir) and workspace_dir.startswith(tempfile.gettempdir()):
                shutil.rmtree(workspace_dir, ignore_errors=True)
                logger.info("Cleaned up sandbox workspace %s", workspace_dir)
        except Exception as e:
            logger.warning("Error cleaning up workspace %s: %s", workspace_dir, str(e))


sandbox_runner = SandboxRunner()
