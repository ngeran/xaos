#!/usr/bin/env python3
# =================================================================================================
#
# FILE:               run.py (Orchestrator for Backup & Restore)
#
# OVERVIEW:
#   High-performance, asynchronous orchestrator for running backup and restore operations
#   on Juniper devices. This script parses command-line arguments, manages workflows,
#   and emits standardized, single-line JSON progress updates for real-time frontend consumption.
#
# KEY FEATURES:
#   - Standardized JSON Output: All progress and result events are sent to `stdout` as single-line JSON.
#   - Dual Operation Modes: Supports 'backup' and 'restore' via the `--command` flag.
#   - Concurrent Operations: Uses asyncio for parallel backups.
#   - Flexible Targeting: Supports single host or YAML inventory file.
#   - Decoupled Worker Logic: Progress reporting via callback for granular UI updates.
#
# =================================================================================================
 
import argparse
import json
import sys
import logging
import traceback
import yaml
import asyncio
from pathlib import Path
from datetime import datetime
 
# Local worker classes
sys.path.append(str(Path(__file__).parent))
from BackupConfig import BackupManager
from RestoreConfig import RestoreManager
 
# =================================================================================================
# SECTION 2: UTILITIES & CONFIGURATION
# =================================================================================================
 
def setup_logging():
    logger = logging.getLogger(__name__)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stderr)
        formatter = logging.Formatter(
            "%(asctime)s - [ORCHESTRATOR] - %(levelname)s - %(message)s"
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        logger.setLevel(logging.INFO)
    return logger
 
def send_progress(level: str, event_type: str, data: dict, message: str = ""):
    """
    Emit a structured JSON progress event to stdout (for FastAPI/WS consumption)
    """
    progress_update = {
        "level": level.upper(),
        "event_type": event_type,
        "message": message,
        "data": data,
        "timestamp": datetime.utcnow().isoformat(),
    }
    print(json.dumps(progress_update), file=sys.stdout, flush=True)
 
def parse_inventory_file(inventory_path: Path) -> list[str]:
    with open(inventory_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    if not isinstance(data, list):
        raise TypeError(
            f"Inventory file '{inventory_path.name}' is not a valid YAML list."
        )
    return [
        d["ip_address"]
        for loc in data
        for dt in ["routers", "switches"]
        for d in loc.get(dt, [])
        if d.get("vendor", "").upper() == "JUNIPER" and d.get("ip_address")
    ]
 
# =================================================================================================
# SECTION 3: MAIN ASYNCHRONOUS ORCHESTRATOR
# =================================================================================================
 
async def main():
    logger = setup_logging()
    parser = argparse.ArgumentParser(
        description="Juniper Backup and Restore Orchestrator"
    )
    parser.add_argument("--command", choices=["backup", "restore"], required=True)
    parser.add_argument("--hostname")
    parser.add_argument("--inventory_file")
    parser.add_argument("--username", required=True)
    parser.add_argument("--password", required=True)
    parser.add_argument("--backup_path", default="/backups")
    parser.add_argument("--backup_file")
    parser.add_argument("--type", default="override", choices=["override", "merge", "update"])
    parser.add_argument("--confirmed_commit_timeout", type=int, default=0)
    parser.add_argument("--commit_timeout", type=int, default=300)
 
    final_results = {}
    is_overall_success = False
    try:
        args = parser.parse_args()
 
        # ---------------------------------------------------------------------------------------------
        # Backup Workflow
        # ---------------------------------------------------------------------------------------------
        if args.command == "backup":
            # Determine list of hosts
            if args.inventory_file:
                inventory_path = Path(args.inventory_file)
                if not inventory_path.is_file():
                    raise FileNotFoundError(
                        f"Inventory file not found at: {inventory_path}"
                    )
                hosts_to_run = parse_inventory_file(inventory_path)
            elif args.hostname:
                hosts_to_run = [
                    h.strip() for h in args.hostname.split(",") if h.strip()
                ]
            else:
                raise ValueError("No target specified. Use --hostname or --inventory_file for backup.")
 
            if not hosts_to_run:
                raise ValueError("No target hosts found for backup.")
 
            total_steps = len(hosts_to_run) * 2  # (Connect + Backup per host)
            send_progress(
                "info",
                "OPERATION_START",
                {"total_steps": total_steps},
                f"Starting backup for {len(hosts_to_run)} device(s)",
            )
 
            # Async backup on all devices
            tasks = [
                BackupManager(
                    h,
                    args.username,
                    args.password,
                    Path(args.backup_path),
                    i * 2,
                    send_progress,
                ).run_backup()
                for i, h in enumerate(hosts_to_run)
            ]
            results = await asyncio.gather(*tasks)
 
            succeeded = {
                data["host"]: data for status, data in results if status == "SUCCESS"
            }
            failed = {
                data["host"]: data["error"]
                for status, data in results
                if status == "FAILED"
            }
            is_overall_success = not failed
            final_results = {
                "success": is_overall_success,
                "message": f"Backup finished. Succeeded: {len(succeeded)}, Failed: {len(failed)}.",
                "details": {"succeeded": succeeded, "failed": failed},
            }
 
        # ---------------------------------------------------------------------------------------------
        # Restore Workflow
        # ---------------------------------------------------------------------------------------------
        elif args.command == "restore":
            if not args.hostname:
                raise ValueError("A target --hostname is required for the restore command.")
            if not args.backup_file:
                raise ValueError("A --backup_file name is required for the restore command.")
            send_progress(
                "info",
                "OPERATION_START",
                {"total_steps": 4},
                f"Starting restore for {args.hostname}",
            )
            manager = RestoreManager(
                host=args.hostname,
                username=args.username,
                password=args.password,
                backup_path=Path(args.backup_path),
                backup_file=args.backup_file,
                restore_type=args.type,
                confirmed_timeout=args.confirmed_commit_timeout,
                commit_timeout=args.commit_timeout,
                step_offset=0,
                progress_callback=send_progress,
            )
            status, data = await manager.run_restore()
            is_overall_success = status == "SUCCESS"
            final_results = {
                "success": is_overall_success,
                "message": data.get("message", data.get("error")),
                "details": data,
            }
 
        # Announce the completion of the entire operation.
        send_progress(
            "success" if is_overall_success else "error",
            "OPERATION_COMPLETE",
            {"status": "SUCCESS" if is_overall_success else "FAILED"},
            "All operations finished.",
        )
 
    except Exception as e:
        error_msg = f"A critical error occurred in the orchestrator: {e}"
        logger.error(error_msg, exc_info=True)
        send_progress("error", "OPERATION_COMPLETE", {"status": "FAILED"}, error_msg)
        final_results = {
            "success": False,
            "message": error_msg,
            "traceback": traceback.format_exc(),
        }
        print(json.dumps(final_results))
        sys.exit(1)
 
    print(json.dumps(final_results))
    sys.exit(0 if is_overall_success else 1)
 
if __name__ == "__main__":
    asyncio.run(main())

{master:0}
mist@ORIENGWANDJEX01> file show /var/tmp/BackupConfig.py | no-more                                                                  
# ====================================================================================
# FILE: BackupConfig.py
# SECTION 2: BACKUP MANAGER CLASS
# Encapsulates all logic for the backup of a single device, with detailed progress.
# ====================================================================================
import json
import asyncio
from datetime import datetime
from pathlib import Path
from lxml import etree
from jnpr.junos import Device
 
class BackupManager:
    """Manages the backup process for a single Juniper device."""
 
    def __init__(self, host, username, password, backup_path: Path, step_offset: int, progress_callback: callable):
        self.host = host
        self.username = username
        self.password = password
        self.backup_path = backup_path
        self.step_offset = step_offset
        self.progress_callback = progress_callback
        self.dev = None
 
    def _save_config_files(self) -> dict:
        hostname = self.dev.facts.get("hostname", self.host)
        device_backup_path = self.backup_path / hostname
        device_backup_path.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        files_created = {}
 
        # XML format
        try:
            config_xml = self.dev.rpc.get_config()
            xml_content = etree.tostring(config_xml, pretty_print=True) if config_xml is not None else b""
            xml_filepath = device_backup_path / f"{timestamp}_{hostname}_config.xml"
            xml_filepath.write_bytes(xml_content)
            files_created["xml"] = str(xml_filepath)
        except Exception as e:
            self.progress_callback("warning", "FILE_SAVE_ERROR", {"format": "xml"}, f"XML config save failed: {e}")
 
        # Set format
        try:
            config_set = self.dev.rpc.get_config(options={"format": "set"})
            set_content = config_set.text if config_set is not None and hasattr(config_set, 'text') else ""
            set_filepath = device_backup_path / f"{timestamp}_{hostname}_config.set"
            set_filepath.write_text(set_content)
            files_created["set"] = str(set_filepath)
        except Exception as e:
            self.progress_callback("warning", "FILE_SAVE_ERROR", {"format": "set"}, f"Set config save failed: {e}")
 
        # JSON format
        try:
            config_json = self.dev.rpc.get_config(options={"format": "json"})
            json_filepath = device_backup_path / f"{timestamp}_{hostname}_config.json"
            json_filepath.write_text(json.dumps(config_json or {}, indent=4))
            files_created["json"] = str(json_filepath)
        except Exception as e:
            self.progress_callback("warning", "FILE_SAVE_ERROR", {"format": "json"}, f"JSON config save failed: {e}")
 
        # Text/conf format
        try:
            config_text = self.dev.rpc.get_config(options={'format': 'text'})
            text_content = config_text.text if config_text is not None and hasattr(config_text, 'text') else ""
            text_filepath = device_backup_path / f"{timestamp}_{hostname}_config.conf"
            text_filepath.write_text(text_content)
            files_created["text"] = str(text_filepath)
        except Exception as e:
            self.progress_callback("warning", "FILE_SAVE_ERROR", {"format": "text"}, f"Text config save failed: {e}")
 
        return files_created
 
    async def run_backup(self) -> tuple:
        connect_step = self.step_offset + 1
        backup_step = self.step_offset + 2
        try:
            # --- Step 1: Connect to Device ---
            self.progress_callback("info", "STEP_START", {"step": connect_step}, f"Connecting to {self.host}...")
            self.dev = Device(host=self.host, user=self.username, password=self.password, gather_facts=True, normalize=True)
            try:
                await asyncio.to_thread(self.dev.open)
            except Exception as connect_err:
                # More detailed error handling for connection/authentication
                err_msg = str(connect_err)
                if "Authentication failed" in err_msg or "permission" in err_msg.lower():
                    user_msg = "Authentication failed: Check username/password."
                elif "Timeout" in err_msg or "timed out" in err_msg.lower():
                    user_msg = "Connection timed out: Device unreachable."
                elif "unknown host" in err_msg.lower() or "not known" in err_msg.lower():
                    user_msg = "DNS/host error: Hostname not found."
                else:
                    user_msg = f"Connection failed: {err_msg}"
 
                self.progress_callback("error", "STEP_COMPLETE", {"step": connect_step, "status": "FAILED"}, user_msg)
                return ("FAILED", {"host": self.host, "error": user_msg})
 
            hostname = self.dev.facts.get("hostname", self.host)
            self.progress_callback("success", "STEP_COMPLETE", {"step": connect_step, "status": "COMPLETED"}, f"Successfully connected to {hostname}")
 
            # --- Step 2: Perform Backup ---
            self.progress_callback("info", "STEP_START", {"step": backup_step}, f"Starting backup for {hostname}...")
            try:
                files = await asyncio.to_thread(self._save_config_files)
            except Exception as backup_error:
                self.progress_callback("error", "STEP_COMPLETE", {"step": backup_step, "status": "FAILED"}, f"Backup failed: {backup_error}")
                return ("FAILED", {"host": self.host, "error": f"Backup failed: {backup_error}"})
 
            self.progress_callback("success", "STEP_COMPLETE", {"step": backup_step, "status": "COMPLETED"}, f"Backup for {hostname} successful")
            return ("SUCCESS", {"host": self.host, "hostname": hostname, "files": files})
 
        except Exception as e:
            error_message = f"Unexpected error for {self.host}: {str(e)}"
            self.progress_callback("error", "STEP_COMPLETE", {"step": connect_step, "status": "FAILED"}, error_message)
            return ("FAILED", {"host": self.host, "error": error_message})
 
        finally:
            if self.dev and self.dev.connected:
                self.dev.close()