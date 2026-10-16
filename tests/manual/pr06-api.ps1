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
    $email = "pr6.$([guid]::NewGuid().ToString('N'))@example.test"
    $password = [guid]::NewGuid().ToString('N')
    $null = Call-Api POST '/auth/register' 201 @{name=$Name;email=$email;password=$password}
    return (Call-Api POST '/auth/login' 200 @{email=$email;password=$password})
}
$a = New-TestSession 'PR6 Harness A'
$b = New-TestSession 'PR6 Harness B'
$initial = Call-Api GET '/dashboard' 200 $null $b.token
$emptyNotifications = @(Call-Api GET '/notifications' 200 $null $b.token)
if ($initial.feed.Count -ne 0 -or $emptyNotifications.Count -ne 0) { throw 'Conta nova recebeu dados alheios.' }
$null = Call-Api PUT "/users/$($a.user.id)/follow" 200 $null $b.token
$reviewA = Call-Api POST '/games/game-1/reviews' 201 @{text='Publicação PR6 para seguidores'} $a.token
$reviewB = Call-Api POST '/games/game-2/reviews' 201 @{text='Review PR6 para comentário'} $b.token
$comment = Call-Api POST "/reviews/$($reviewB.id)/comments" 201 @{text='Comentário PR6 de outra conta'} $a.token
$oldComment = Call-Api POST '/reviews/review-fixture/comments' 201 @{text='Comentário recente em review antiga PR6'} $a.token
$null = Call-Api PUT '/favorites/game/game-2' 200 $null $b.token
$null = Call-Api PUT '/favorites/review/review-fixture' 200 $null $b.token
$dashboard = Call-Api GET '/dashboard' 200 $null $b.token
$feed = @(Call-Api GET '/feed/following' 200 $null $b.token)
if (@($dashboard.feed | Where-Object id -eq $reviewA.id).Count -ne 1 -or @($feed | Where-Object id -eq $reviewA.id).Count -ne 1 -or $dashboard.favorites.games.Count -ne 1 -or $dashboard.favorites.reviews.Count -ne 1) { throw 'Dashboard/feed incompatíveis.' }
$notifications = @(Call-Api GET '/notifications' 200 $null $b.token)
if (@($notifications | Where-Object { $_.type -eq 'new-review' -and $_.reviewId -eq $reviewA.id -and $_.actor.id -eq $a.user.id }).Count -ne 1 -or @($notifications | Where-Object { $_.type -eq 'review-comment' -and $_.commentId -eq $comment.id -and $_.actor.id -eq $a.user.id }).Count -ne 1) { throw 'Eventos ausentes ou duplicados.' }
if (@($notifications | Where-Object userId -ne $b.user.id).Count -ne 0) { throw 'Notificações de outro destinatário.' }
$null = Call-Api GET '/community/reviews/recent' 200
foreach ($period in @('24h','7d','30d')) {
    $ranked = @(Call-Api GET "/community/reviews/most-commented?period=$period" 200)
    $games = @(Call-Api GET "/community/games/in-discussion?period=$period" 200)
    $old = @($ranked | Where-Object { $_.review.id -eq 'review-fixture' })
    if ($old.Count -ne 1 -or $old[0].commentCount -lt 1 -or [DateTimeOffset]$old[0].lastCommentAt -lt [DateTimeOffset]$oldComment.createdAt -or @($games | Where-Object { $_.game.id -eq 'game-3' }).Count -ne 1) { throw 'Review antiga com comentário recente não apareceu no ranking.' }
}
$null = Call-Api GET '/community/reviews/most-commented?period=invalid' 400
$null = Call-Api GET '/community/games/in-discussion?period=invalid' 400
$null = Call-Api DELETE "/users/$($a.user.id)/follow" 204 $null $b.token
$feed = @(Call-Api GET '/feed/following' 200 $null $b.token)
if ($feed.Count -ne 0) { throw 'Feed não refletiu unfollow.' }
$null = Call-Api GET '/dashboard' 401
$null = Call-Api GET '/feed/following' 401
$null = Call-Api GET '/notifications' 401
$null = Call-Api POST '/auth/logout' 204 $null $b.token
$null = Call-Api GET '/notifications' 401 $null $b.token
$null = Call-Api POST '/auth/logout' 204 $null $a.token
# Saída sem corpos, credenciais ou headers.
$records | ConvertTo-Json
