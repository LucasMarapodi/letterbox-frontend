param([string]$ApiBase = 'http://localhost:5080')
$ErrorActionPreference = 'Stop'
$records = [System.Collections.Generic.List[object]]::new()
function Call-Api([string]$Method, [string]$Path, [int]$Expected, $Body = $null, [string]$Token = '') {
    $headers = @{ Origin = 'http://127.0.0.1:5173' }
    if ($Token) { $headers.Authorization = "Bearer $Token" }
    $args = @{ Uri = "$ApiBase/api/v1$Path"; Method = $Method; Headers = $headers; SkipHttpErrorCheck = $true }
    if ($null -ne $Body) { $args.ContentType = 'application/json'; $args.Body = $Body | ConvertTo-Json -Compress }
    $response = Invoke-WebRequest @args
    if ([int]$response.StatusCode -ne $Expected) { throw "Status inesperado em $Method $Path" }
    if ($response.Headers['Access-Control-Allow-Origin'] -ne 'http://127.0.0.1:5173') { throw 'Header CORS ausente.' }
    $records.Add([pscustomobject]@{ method=$Method; path=$Path; status=[int]$response.StatusCode })
    if ($response.Content.Length) { return ($response.Content | ConvertFrom-Json) }
}
function New-TestSession([string]$Name) {
    $email = "pr5.$([guid]::NewGuid().ToString('N'))@example.test"
    $password = [guid]::NewGuid().ToString('N')
    $registered = Call-Api POST '/auth/register' 201 @{name=$Name;email=$email;password=$password}
    $public = Call-Api GET "/users/$($registered.id)" 200
    if ($public.id -ne $registered.id -or $public.PSObject.Properties.Name -contains 'email') { throw 'Perfil público incompatível.' }
    return (Call-Api POST '/auth/login' 200 @{email=$email;password=$password})
}
$a = New-TestSession 'PR5 Harness A'
$b = New-TestSession 'PR5 Harness B'
$null = Call-Api GET '/users/missing-pr5' 404
$null = Call-Api GET "/users/$($a.user.id)/reviews" 200
$null = Call-Api GET "/users/$($a.user.id)/followers" 200
$null = Call-Api GET "/users/$($a.user.id)/following" 200
$changed = Call-Api PATCH '/users/me/profile' 200 @{displayName='PR5 atualizado';bio='Bio da API';avatarUrl='https://example.test/avatar.png'} $a.token
$cleared = Call-Api PATCH '/users/me/profile' 200 @{avatarUrl=$null} $a.token
if ($cleared.displayName -ne $changed.displayName -or $cleared.bio -ne $changed.bio -or $null -ne $cleared.avatarUrl) { throw 'Omissão/null de perfil incompatíveis.' }
$me = Call-Api GET '/auth/me' 200 $null $a.token
if ($me.displayName -ne $cleared.displayName) { throw 'Perfil e me divergentes.' }
$null = Call-Api PATCH '/users/me/profile' 400 @{displayName=''} $a.token
$null = Call-Api PATCH '/users/me/profile' 400 @{avatarUrl='ftp://example.test/avatar.png'} $a.token
$null = Call-Api PATCH '/users/me/profile' 401 @{bio='Visitante'}
$target = "/users/$($b.user.id)"
$initial = Call-Api GET "$target/follow/me" 200 $null $a.token
if ($initial.following) { throw 'Relação inicial inesperada.' }
$null = Call-Api PUT "$target/follow" 200 $null $a.token
$null = Call-Api PUT "$target/follow" 200 $null $a.token
$following = Call-Api GET "$target/follow/me" 200 $null $a.token
if (!$following.following) { throw 'Relação não confirmada.' }
$followers = @(Call-Api GET "$target/followers" 200)
$outgoing = @(Call-Api GET "/users/$($a.user.id)/following" 200)
if (@($followers | Where-Object id -eq $a.user.id).Count -ne 1 -or @($outgoing | Where-Object id -eq $b.user.id).Count -ne 1) { throw 'Conexões ausentes ou duplicadas.' }
$null = Call-Api PUT "/users/$($a.user.id)/follow" 400 $null $a.token
$null = Call-Api PUT "$target/follow" 401
$null = Call-Api DELETE "$target/follow" 204 $null $a.token
$null = Call-Api DELETE "$target/follow" 204 $null $a.token
$removed = Call-Api GET "$target/follow/me" 200 $null $a.token
if ($removed.following) { throw 'Relação não removida.' }
$empty = Call-Api GET '/favorites/game/game-2' 200 $null $a.token
if ($null -ne $empty.favorite) { throw 'Favorito inicial inesperado.' }
$game = Call-Api PUT '/favorites/game/game-2' 200 $null $a.token
$again = Call-Api PUT '/favorites/game/game-2' 200 $null $a.token
if ($game.id -ne $again.id) { throw 'Favorito duplicado.' }
$null = Call-Api GET '/favorites/review/review-fixture' 200 $null $a.token
$null = Call-Api PUT '/favorites/review/review-fixture' 200 $null $a.token
$lists = Call-Api GET '/favorites' 200 $null $a.token
$other = Call-Api GET '/favorites' 200 $null $b.token
if ($lists.games.Count -ne 1 -or $lists.reviews.Count -ne 1 -or $other.games.Count -ne 0 -or $other.reviews.Count -ne 0) { throw 'Listas incompatíveis ou vazamento.' }
$null = Call-Api GET '/favorites/game/missing-pr5' 404 $null $a.token
$null = Call-Api GET '/favorites/invalid/game-2' 400 $null $a.token
$null = Call-Api GET '/favorites' 401
$null = Call-Api DELETE '/favorites/game/game-2' 204 $null $a.token
$null = Call-Api DELETE '/favorites/review/review-fixture' 204 $null $a.token
$empty = Call-Api GET '/favorites/game/game-2' 200 $null $a.token
$lists = Call-Api GET '/favorites' 200 $null $a.token
if ($null -ne $empty.favorite -or $lists.games.Count -ne 0 -or $lists.reviews.Count -ne 0) { throw 'Favoritos não removidos.' }
$null = Call-Api POST '/auth/logout' 204 $null $a.token
$null = Call-Api GET '/favorites' 401 $null $a.token
$null = Call-Api POST '/auth/logout' 204 $null $b.token
# Saída sem corpos, credenciais ou headers.
$records | ConvertTo-Json
