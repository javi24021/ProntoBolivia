const execSync = require('child_process').execSync;

console.log("🚀 Iniciando instalación de emergencia sin tocar el disco D...");

process.env.TMPDIR = "C:\\Windows\\Temp";
process.env.TMP = "C:\\Windows\\Temp";
process.env.TEMP = "C:\\Windows\\Temp";

execSync('D:\\node.exe .\\package\\bin\\npm-cli.js install --prefix . --no-audit --no-fund', { stdio: 'inherit' });

console.log("✅ ¡Proceso terminado!");