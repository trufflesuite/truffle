
# Download and install last Geth version for windows.
# There is no Geth Docker version for windows.
# This must be powershell script because git bash does not have package manager and cannot install anything.
Write-Output "Download geth..."
Invoke-WebRequest  https://gethstore.blob.core.windows.net/builds/geth-windows-amd64-1.9.9-01744997.exe -OutFile geth-windows-amd64-1.9.9-01744997.exe
Write-Output "Install geth... Wait 30 seconds"
Start-Process -FilePath geth-windows-amd64-1.9.9-01744997.exe -ArgumentList "/S"
sleep 30
