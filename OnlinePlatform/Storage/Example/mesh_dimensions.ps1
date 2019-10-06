# Выдает размерности всех мешей в каталоге ресурсов

$SEARCH_DIR = "Assets"

# Посчитать размерность меша
function Get-MeshDimensions($data) {

    $minX = $minY = $minZ = [Int32]::MaxValue
    $maxX = $maxY = $maxZ = [Int32]::MinValue

    for($i = 0; $i -lt $data.vertices.Length; $i += 3) {
        $x, $y, $z = $data.vertices[$i..($i + 2)]
        
        if($x -lt $minX) { $minX = $x }
        if($x -gt $maxX) { $maxX = $x }
        
        if($y -lt $minY) { $minY = $y }
        if($y -gt $maxY) { $maxY = $y }
        
        if($z -lt $minZ) { $minZ = $z }
        if($z -gt $maxZ) { $maxZ = $z }
    }

    $dimX = [Math]::Round($maxX - $minX, 3)
    $dimY = [Math]::Round($maxY - $minY, 3)
    $dimZ = [Math]::Round($maxZ - $minZ, 3)

    return @($dimX, $dimY, $dimZ)
}

Get-ChildItem -Path $SEARCH_DIR -Filter "*.json" | % {
    $meshData = Get-Content $_.FullName | ConvertFrom-Json
    $dimensions = Get-MeshDimensions $meshData

    $_.Name | Out-Default
    "[$($dimensions[0]), $($dimensions[1]), $($dimensions[2])]" | Out-Default
    [String]::Empty | Out-Default
}