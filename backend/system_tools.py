import os

# Check for Windows OS
IS_WINDOWS = os.name == 'nt'

try:
    if IS_WINDOWS:
        from AppOpener import open as win_open, close as win_close
        APP_OPENER_AVAILABLE = True
    else:
        APP_OPENER_AVAILABLE = False
except ImportError:
    APP_OPENER_AVAILABLE = False
    
try:
    from ppadb.client import Client as AdbClient
    ADB_AVAILABLE = True
except ImportError:
    ADB_AVAILABLE = False

import logging
import time

logger = logging.getLogger("system-tools")

class SystemControl:
    def __init__(self):
        # Initialize ADB Client
        self.device = None
        if ADB_AVAILABLE:
            try:
                self.adb = AdbClient(host="127.0.0.1", port=5037)
                # Try to connect to first device
                devices = self.adb.devices()
                if devices:
                    self.device = devices[0]
                    logger.info(f"Connected to Android Device: {self.device.serial}")
                else:
                    logger.warning("No Android device connected via ADB.")
            except Exception as e:
                logger.warning(f"ADB Connection failed: {e}")
        else:
            logger.info("ADB client not available (Cloud Environment)")

    def open_windows_app(self, app_name):
        """Opens a Windows application by name."""
        if not APP_OPENER_AVAILABLE:
            return "Windows App Control is not available in Cloud Environment."
            
        try:
            logger.info(f"Opening Windows App: {app_name}")
            win_open(app_name, match_closest=True, output=False)
            return f"Opening {app_name} on Windows."
        except Exception as e:
            logger.error(f"Failed to open Windows app: {e}")
            return f"Failed to open {app_name}."

    def close_windows_app(self, app_name):
        """Closes a Windows application by name."""
        if not APP_OPENER_AVAILABLE:
            return "Windows App Control is not available in Cloud Environment."

        try:
            logger.info(f"Closing Windows App: {app_name}")
            win_close(app_name, match_closest=True, output=False)
            return f"Closing {app_name} on Windows."
        except Exception as e:
            logger.error(f"Failed to close Windows app: {e}")
            return f"Failed to close {app_name}."

    def open_android_app(self, package_name):
        """Opens an Android app by package name (e.g., com.whatsapp)."""
        if not self.device:
            return "No Android device connected."
        
        try:
            logger.info(f"Opening Android App: {package_name}")
            self.device.shell(f"monkey -p {package_name} -c android.intent.category.LAUNCHER 1")
            return f"Opening {package_name} on Android."
        except Exception as e:
            logger.error(f"Failed to open Android app: {e}")
            return f"Failed to open Android app {package_name}."

    def close_android_app(self, package_name):
        """Closes (Force Stops) an Android app."""
        if not self.device:
            return "No Android device connected."
        
        try:
            logger.info(f"Closing Android App: {package_name}")
            self.device.shell(f"am force-stop {package_name}")
            return f"Closing {package_name} on Android."
        except Exception as e:
            logger.error(f"Failed to close Android app: {e}")
            return f"Failed to close Android app {package_name}."
    
    def command_android_assistant(self, command):
        """
        Triggers Google Assistant on the Android device and injects the text command.
        This allows controlling system tools (WiFi, Bluetooth, Alarms) via Assistant.
        """
        if not self.device:
            return "No Android device connected."

        try:
            logger.info(f"Sending command to Google Assistant: {command}")
            
            # 1. Wake up device
            self.device.shell("input keyevent KEYCODE_WAKEUP")
            
            # 2. Launch Google Assistant (Generic Assist Intent)
            # This typically brings up the Assistant overlay
            self.device.shell("am start -a android.intent.action.ASSIST")
            time.sleep(1) # Wait for UI
            
            # 3. Try to focus text input (This is tricky, may rely on Assistant settings)
            # A common workaround is sending the text directly if an input field is present,
            # OR determining if we can launch the 'OpaActivity' directly in text mode.
            # For resilience, we'll assume the Assistant is listening or accepting input.
            # But standard 'ASSIST' is voice often.
            
            # Alternative: Search Intent which is handled by Assistant often
            # self.device.shell(f'am start -a android.intent.action.WEB_SEARCH -e query "{command}"') 
            # ^ This often opens Google Search, not necessarily Device Actions (like "Turn on flashlight").
            
            # Best "Control" Method via ADB without root for Assistant Actions:
            # We simulate typing the command.
            # Check if keyboard is open? Unlikely initially.
            # We can force the text usage by launching the specific Google App activity if known, 
            # but that varies by version.
            
            # Universal Fallback Strategy:
            # Send 'Search' intent with the command. Google App often executes system actions from search bar now.
            cmd_escaped = command.replace(" ", "%20")
            self.device.shell(f'am start -a android.intent.action.VOICE_COMMAND') # Tries to start Voice
            # Logic: We can't easily inject voice.
            
            # Let's try the Keyboard injection method which is most requested for "using assistant tools"
            # Launch Assistant
            self.device.shell("am start -n com.google.android.googlequicksearchbox/com.google.android.apps.gsa.staticplugins.opa.OpaActivity")
            time.sleep(1.5)
            
            # Tap the "Keyboard" icon? Coordinates vary. 
            # Fallback: Send text directly via 'input text'. 
            # Requires spaces to be escaped.
            text_input = command.replace(" ", "%s")
            self.device.shell(f"input text {text_input}")
            time.sleep(0.5)
            self.device.shell("input keyevent 66") # Enter
            
            return f"Sent '{command}' to Android Assistant."
        except Exception as e:
            logger.error(f"Assistant command failed: {e}")
            return f"Failed to invoke Assistant: {e}"
