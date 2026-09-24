# Provisions the sd_requisitioncomment table (publisher: Sefa Duman, prefix sd_) in Dataverse
# via the metadata Web API. Auth uses a dependency-free OAuth device-code flow.
# Idempotent: skips anything that already exists.

$ErrorActionPreference = 'Stop'

# Windows PowerShell 5.1 defaults to TLS 1.0/1.1 which AAD/Dataverse reject.
[Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
try { [System.Net.WebRequest]::DefaultWebProxy.Credentials = [System.Net.CredentialCache]::DefaultCredentials } catch {}

$EnvUrl   = 'https://YOUR_ORG.crm.dynamics.com'
$Api      = "$EnvUrl/api/data/v9.2"
$ClientId = '51f81489-12ee-4a9e-aaae-a2591f45987d'   # well-known Dataverse public client (device code capable)
$Authority = 'https://login.microsoftonline.com/organizations/oauth2/v2.0'
$Scope    = "$EnvUrl/.default offline_access openid profile"

# ---------------------------------------------------------------- auth (device code)
Write-Host '== Requesting device code ==' -ForegroundColor Cyan
$dc = Invoke-RestMethod -Method Post -Uri "$Authority/devicecode" -ContentType 'application/x-www-form-urlencoded' -Body @{
    client_id = $ClientId
    scope     = $Scope
}
Write-Host ''
Write-Host $dc.message -ForegroundColor Yellow
Write-Host ''

$token = $null
$deadline = (Get-Date).AddSeconds([int]$dc.expires_in)
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds ([int]$dc.interval)
    try {
        $tok = Invoke-RestMethod -Method Post -Uri "$Authority/token" -ContentType 'application/x-www-form-urlencoded' -Body @{
            grant_type  = 'urn:ietf:params:oauth:grant-type:device_code'
            client_id   = $ClientId
            device_code = $dc.device_code
        }
        $token = $tok.access_token
        break
    } catch {
        $err = $null
        if ($_.ErrorDetails.Message) { try { $err = ($_.ErrorDetails.Message | ConvertFrom-Json).error } catch {} }
        if ($err -eq 'authorization_pending' -or $err -eq 'slow_down') { continue }
        throw "Device code auth failed: $($_.ErrorDetails.Message)"
    }
}
if (-not $token) { throw 'Timed out waiting for sign-in.' }
Write-Host 'Signed in.' -ForegroundColor Green

$headers = @{
    Authorization       = "Bearer $token"
    'OData-MaxVersion'  = '4.0'
    'OData-Version'     = '4.0'
    Accept              = 'application/json'
    'Content-Type'      = 'application/json; charset=utf-8'
}

function Invoke-Dv {
    param([string]$Method, [string]$Url, $Body)
    try {
        if ($null -ne $Body) {
            $json = $Body | ConvertTo-Json -Depth 25
            return Invoke-WebRequest -Method $Method -Uri $Url -Headers $headers -Body $json -UseBasicParsing
        }
        return Invoke-WebRequest -Method $Method -Uri $Url -Headers $headers -UseBasicParsing
    } catch {
        $msg = $_.ErrorDetails.Message
        if (-not $msg -and $_.Exception.Response) {
            $sr = New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())
            $msg = $sr.ReadToEnd()
        }
        throw "HTTP $Method $Url failed: $msg"
    }
}

function Test-Exists {
    param([string]$Url)
    try { Invoke-WebRequest -Method Get -Uri $Url -Headers $headers -UseBasicParsing | Out-Null; return $true }
    catch { return $false }
}

function Label {
    param([string]$Text)
    @{
        '@odata.type'    = 'Microsoft.Dynamics.CRM.Label'
        LocalizedLabels  = @(@{ '@odata.type' = 'Microsoft.Dynamics.CRM.LocalizedLabel'; Label = $Text; LanguageCode = 1033 })
    }
}

# ---------------------------------------------------------------- publisher
Write-Host '== Ensuring publisher (Sefa Duman / sd_) ==' -ForegroundColor Cyan
$pubResp = (Invoke-Dv Get "$Api/publishers?`$select=publisherid,uniquename,customizationprefix&`$filter=customizationprefix eq 'sd'").Content | ConvertFrom-Json
if ($pubResp.value.Count -gt 0) {
    Write-Host "Publisher with prefix 'sd' already exists: $($pubResp.value[0].uniquename)" -ForegroundColor Green
} else {
    $pub = @{
        uniquename                     = 'sefaduman'
        friendlyname                   = 'Sefa Duman'
        customizationprefix            = 'sd'
        customizationoptionvalueprefix = 20362
    }
    Invoke-Dv Post "$Api/publishers" $pub | Out-Null
    Write-Host 'Created publisher Sefa Duman (sd_).' -ForegroundColor Green
}

# ---------------------------------------------------------------- entity
$entityLogical = 'sd_requisitioncomment'
Write-Host '== Ensuring table sd_requisitioncomment ==' -ForegroundColor Cyan
if (Test-Exists "$Api/EntityDefinitions(LogicalName='$entityLogical')") {
    Write-Host 'Table already exists.' -ForegroundColor Green
} else {
    $entity = @{
        '@odata.type'         = 'Microsoft.Dynamics.CRM.EntityMetadata'
        SchemaName            = 'sd_RequisitionComment'
        DisplayName           = (Label 'Requisition Comment')
        DisplayCollectionName = (Label 'Requisition Comments')
        Description           = (Label 'Collaboration comments and attachments for purchase requisitions.')
        OwnershipType         = 'UserOwned'
        IsActivity            = $false
        HasActivities         = $false
        HasNotes              = $false
        Attributes            = @(
            @{
                '@odata.type' = 'Microsoft.Dynamics.CRM.StringAttributeMetadata'
                IsPrimaryName = $true
                SchemaName    = 'sd_Name'
                MaxLength     = 200
                FormatName    = @{ Value = 'Text' }
                RequiredLevel = @{ Value = 'None' }
                DisplayName   = (Label 'Name')
            }
        )
    }
    Invoke-Dv Post "$Api/EntityDefinitions" $entity | Out-Null
    Write-Host 'Created table sd_requisitioncomment.' -ForegroundColor Green
}

# ---------------------------------------------------------------- columns
$attrUrl = "$Api/EntityDefinitions(LogicalName='$entityLogical')/Attributes"

function New-Attr {
    param([string]$Logical, [hashtable]$Def)
    if (Test-Exists "$attrUrl(LogicalName='$Logical')") {
        Write-Host "  column $Logical exists" -ForegroundColor DarkGray
        return
    }
    Invoke-Dv Post $attrUrl $Def | Out-Null
    Write-Host "  + $Logical" -ForegroundColor Green
}

Write-Host '== Ensuring columns ==' -ForegroundColor Cyan

New-Attr 'sd_requisitionnumber' @{
    '@odata.type' = 'Microsoft.Dynamics.CRM.StringAttributeMetadata'
    SchemaName    = 'sd_RequisitionNumber'
    MaxLength     = 100
    FormatName    = @{ Value = 'Text' }
    RequiredLevel = @{ Value = 'ApplicationRequired' }
    DisplayName   = (Label 'Requisition Number')
}

New-Attr 'sd_linenumber' @{
    '@odata.type' = 'Microsoft.Dynamics.CRM.IntegerAttributeMetadata'
    SchemaName    = 'sd_LineNumber'
    Format        = 'None'
    MinValue      = -2147483648
    MaxValue      = 2147483647
    RequiredLevel = @{ Value = 'None' }
    DisplayName   = (Label 'Line Number')
}

New-Attr 'sd_body' @{
    '@odata.type' = 'Microsoft.Dynamics.CRM.MemoAttributeMetadata'
    SchemaName    = 'sd_Body'
    MaxLength     = 4000
    Format        = 'TextArea'
    RequiredLevel = @{ Value = 'ApplicationRequired' }
    DisplayName   = (Label 'Body')
}

New-Attr 'sd_authorpersonnelnumber' @{
    '@odata.type' = 'Microsoft.Dynamics.CRM.StringAttributeMetadata'
    SchemaName    = 'sd_AuthorPersonnelNumber'
    MaxLength     = 40
    FormatName    = @{ Value = 'Text' }
    RequiredLevel = @{ Value = 'None' }
    DisplayName   = (Label 'Author Personnel Number')
}

New-Attr 'sd_authorname' @{
    '@odata.type' = 'Microsoft.Dynamics.CRM.StringAttributeMetadata'
    SchemaName    = 'sd_AuthorName'
    MaxLength     = 200
    FormatName    = @{ Value = 'Text' }
    RequiredLevel = @{ Value = 'None' }
    DisplayName   = (Label 'Author Name')
}

New-Attr 'sd_kind' @{
    '@odata.type' = 'Microsoft.Dynamics.CRM.PicklistAttributeMetadata'
    SchemaName    = 'sd_Kind'
    RequiredLevel = @{ Value = 'None' }
    DisplayName   = (Label 'Kind')
    OptionSet     = @{
        '@odata.type'  = 'Microsoft.Dynamics.CRM.OptionSetMetadata'
        IsGlobal       = $false
        OptionSetType  = 'Picklist'
        Options        = @(
            @{ Value = 100000000; Label = (Label 'Comment') }
            @{ Value = 100000001; Label = (Label 'Clarification') }
            @{ Value = 100000002; Label = (Label 'Budget Note') }
            @{ Value = 100000003; Label = (Label 'System') }
        )
    }
}

New-Attr 'sd_parentcommentid' @{
    '@odata.type' = 'Microsoft.Dynamics.CRM.StringAttributeMetadata'
    SchemaName    = 'sd_ParentCommentId'
    MaxLength     = 100
    FormatName    = @{ Value = 'Text' }
    RequiredLevel = @{ Value = 'None' }
    DisplayName   = (Label 'Parent Comment Id')
}

New-Attr 'sd_attachment' @{
    '@odata.type' = 'Microsoft.Dynamics.CRM.FileAttributeMetadata'
    SchemaName    = 'sd_Attachment'
    MaxSizeInKB   = 32768
    RequiredLevel = @{ Value = 'None' }
    DisplayName   = (Label 'Attachment')
}

# ---------------------------------------------------------------- publish
Write-Host '== Publishing ==' -ForegroundColor Cyan
$publish = @{ ParameterXml = "<importexportxml><entities><entity>$entityLogical</entity></entities></importexportxml>" }
Invoke-Dv Post "$Api/PublishXml" $publish | Out-Null

Write-Host ''
Write-Host 'Done. Table sd_requisitioncomment is ready.' -ForegroundColor Green
Write-Host 'Next: pac code add-data-source -a dataverse -t sd_requisitioncomment' -ForegroundColor Cyan
