Get-Content .env.local | Where-Object { $_ -match '^\s*[^#]' } | ForEach-Object {
    $key, $value = $_ -split '=', 2
    [System.Environment]::SetEnvironmentVariable($key.Trim(), $value.Trim(), 'Process')
}

.\mvnw.cmd spring-boot:run
