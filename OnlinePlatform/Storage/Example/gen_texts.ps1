# Генерация тестовых текстов карт

$N_CARDS = 180
$N_KINDS = 4

$MAX_LINES = 3
$MIN_CHARS = 5
$MAX_CHARS = 25

function Generate-Line($seed) {
    $rnd = New-Object System.Random($seed)
    $buffer = @()
    $nChars = $rnd.Next($MIN_CHARS, $MAX_CHARS)

    for($j = 0; $j -lt $nChars; $j++) {
        $charCode = if($rnd.Next(100) -lt 90) {
			$rnd.Next('a'[0], 'z'[0])
		} else {
			32
		}
        $buffer += [char]$charCode
    }

    return [String]::Join('', $buffer)
}

function Generate-Text($seed) {
    $rnd = New-Object System.Random($seed)
    $str = @()

    $nLines = $rnd.Next($MAX_LINES) + 1

    for($i = 0; $i -lt $nLines; $i++) {
        $str += Generate-Line ($seed * 13 + $i * 3 + $nLines)
    }

    return [String]::Join('__nl__', $str)
}

$data = @()

for($i = 0; $i -lt $N_CARDS; $i++) {
    $data += @{
        Kind = $i % $N_KINDS
        Title = Generate-Line $i
        Text = Generate-Text $i
    }
}

$json = ConvertTo-Json $data
$json | Write-Output