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
    $email = "pr4.$([guid]::NewGuid().ToString('N'))@example.test"
    $password = [guid]::NewGuid().ToString('N')
    $null = Call-Api POST '/auth/register' 201 @{name=$Name;email=$email;password=$password}
    return (Call-Api POST '/auth/login' 200 @{email=$email;password=$password})
}
$a = New-TestSession 'PR4 Harness A'
$b = New-TestSession 'PR4 Harness B'
$null = Call-Api GET '/games?term=Aurora&sort=name-desc' 200
$null = Call-Api GET '/games/game-2' 200
$null = Call-Api GET '/games/missing-pr4' 404
$null = Call-Api GET '/games/game-2/opinions' 200
$initial = Call-Api GET '/games/game-2/rating/me' 200 $null $a.token
if ($null -ne $initial.rating) { throw 'Conta nova recebeu nota alheia.' }
$rating = Call-Api PUT '/games/game-2/rating/me' 200 @{value=4.5} $a.token
if ($rating.value -ne 4.5 -or $rating.userId -ne $a.user.id) { throw 'Nota incompatível.' }
$null = Call-Api PUT '/games/game-2/rating/me' 400 @{value=6} $a.token
$null = Call-Api GET '/games/game-2/rating/me' 401
$initialReview = Call-Api GET '/games/game-2/reviews/me' 200 $null $a.token
if ($null -ne $initialReview.review) { throw 'Conta nova recebeu review alheia.' }
$review = Call-Api POST '/games/game-2/reviews' 201 @{text='Review do harness PR4'} $a.token
$null = Call-Api POST '/games/game-2/reviews' 409 @{text='Duplicada'} $a.token
$null = Call-Api GET '/games/game-2/reviews/me' 200 $null $a.token
$null = Call-Api GET '/games/game-2/reviews' 200
$null = Call-Api GET "/reviews/$($review.id)" 200
$edited = Call-Api PATCH "/reviews/$($review.id)" 200 @{text='Review editada pelo autor'} $a.token
if ($edited.id -ne $review.id -or $edited.createdAt -ne $review.createdAt -or $null -eq $edited.updatedAt) { throw 'Identidade/data da edição incompatível.' }
$null = Call-Api PATCH "/reviews/$($review.id)" 403 @{text='Outro autor'} $b.token
$null = Call-Api PATCH '/reviews/missing-pr4' 404 @{text='Texto'} $a.token
$null = Call-Api GET '/reviews/missing-pr4' 404
$null = Call-Api GET "/reviews/$($review.id)/comments" 200
$comment = Call-Api POST "/reviews/$($review.id)/comments" 201 @{text='Comentário da segunda conta'} $b.token
$comments = @(Call-Api GET "/reviews/$($review.id)/comments" 200)
if (@($comments | Where-Object id -eq $comment.id).Count -ne 1) { throw 'Comentário ausente ou duplicado.' }
$null = Call-Api POST "/reviews/$($review.id)/comments" 400 @{text=' '} $b.token
$null = Call-Api POST '/reviews/missing-pr4/comments' 404 @{text='Texto'} $b.token
$null = Call-Api POST "/reviews/$($review.id)/comments" 401 @{text='Visitante'}
$null = Call-Api POST '/auth/logout' 204 $null $b.token
$null = Call-Api POST "/reviews/$($review.id)/comments" 401 @{text='Token revogado'} $b.token
$null = Call-Api POST '/auth/logout' 204 $null $a.token
# Somente métodos, caminhos públicos e status; nunca corpos, credenciais ou headers.
$records | ConvertTo-Json
