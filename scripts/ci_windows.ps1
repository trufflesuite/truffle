if ( $env:WINDOWS -eq "true") {
  Write-Output "WINDOWS CI SCRIPT"
}

function run_geth{
    Start-Process -FilePath geth `
    -ArgumentList '--rpc', `
    '--rpcaddr 0.0.0.0 ', `
    '--rpcport 8545', `
    '--rpccorsdomain *', `
    '--ws', `
    '--wsaddr 0.0.0.0', `
    '--wsorigins *', `
    '--nodiscover', `
    '--dev', `
    '--dev.period 0', `
    '--allow-insecure-unlock', `
    '--targetgaslimit 7000000', `
    'js ./scripts/geth-accounts.js'
  }

# Download and install last Geth version for windows. 
# There is no Geth Docker version for windows.
Write-Output "Download geth..."
Invoke-WebRequest  https://gethstore.blob.core.windows.net/builds/geth-windows-amd64-1.9.9-01744997.exe -OutFile geth-windows-amd64-1.9.9-01744997.exe
Write-Output "Install geth... Wait 30 seconds"
Start-Process -FilePath geth-windows-amd64-1.9.9-01744997.exe -ArgumentList "/S"

sleep 30

# Add geth path to PATH env so we can call it. 
$env:PATH="$env:PATH;C:\Program Files\Geth"
run_geth
# Run all test and continue even if one package failed --no-bail
lerna run test_windows  --stream --concurrency=1 --no-bail

# Return exit code of last command so CI knows if test failed. 
exit $LASTEXITCODE
