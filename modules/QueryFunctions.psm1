function DoesEntityExists($Table, $Column, $EntityName) {
    Log "Does $EntityName exists in $Table ?"

    $entityNamePattern = SQLEscapedMatchPattern($EntityName.Trim())
    $validateEntityQuery = "SELECT * FROM {0} WHERE {1} LIKE '{2}'" -f $Table, $Column, $entityNamePattern

    $entityFound = RunDBQuery $validateEntityQuery

    Log "Discovered entity: $entityFound"
    return $entityFound
}

function GetPlayTime($GameName) {
    Log "Get existing gameplay time for $GameName"

    $gameNamePattern = SQLEscapedMatchPattern($GameName.Trim())
    $getGamePlayTimeQuery = "SELECT play_time FROM games WHERE name LIKE '{0}'" -f $gameNamePattern

    $recordedGamePlayTime = (RunDBQuery $getGamePlayTimeQuery).play_time

    Log "Detected gameplay time: $recordedGamePlayTime min"
    return $recordedGamePlayTime
}

function GetGameDetails($Game) {
    Log "Finding Details of $Game"

    $pattern = SQLEscapedMatchPattern $Game.Trim()
    $getGameDetailsQuery = "SELECT * FROM games WHERE name LIKE '{0}'" -f $pattern

    $gameDetails = RunDBQuery $getGameDetailsQuery

    Log ("Found details: name: {0}, exe_name: {1}, play_time: {2}" -f $gameDetails.name, $gameDetails.exe_name, $gameDetails.play_time)
    return $gameDetails
}

function GetPCDetails($PC) {
    Log "Finding Details of $PC"

    $pattern = SQLEscapedMatchPattern $PC.Trim()
    $getPCDetailsQuery = "SELECT * FROM gaming_pcs WHERE name LIKE '{0}'" -f $pattern

    $PCDetails = RunDBQuery $getPCDetailsQuery

    Log ("Found details: name: {0}, cost: {1}, start_date: {2}, end_date: {3}, in_use: {4}" -f $PCDetails.name, $PCDetails.cost, $PCDetails.start_date, $PCDetails.end_date, $PCDetails.in_use)
    return $PCDetails
}
