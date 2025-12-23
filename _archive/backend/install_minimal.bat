@echo off
echo Installing FRIDAY dependencies (Low RAM / CPU Optimized)...

echo 1. Installing PyTorch (CPU Version) - Satisfies dependencies without bloat...
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

echo 2. Installing Core Requirements...
pip install -r requirements.txt

echo 3. Installing Flash-Attention/CTranslate2 optimizations (if applicable)...
:: faster-whisper handles its own ctranslate2 installation.

echo Installation Complete.
pause
