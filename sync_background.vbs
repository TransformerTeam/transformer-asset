' ==============================================================================
' GPSC Transformer Asset Management - Silent AM-HV Background Synchronizer
' ==============================================================================
' Purpose: Executes sync_amhv_all.js silently without any command window popup.
' Target: Windows Task Scheduler (GPSC_AMHV_Visual_Sync)
' ==============================================================================

Option Explicit
Dim objShell, fso, scriptDir, cmd

Set objShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)

' Set working directory to project root
objShell.CurrentDirectory = scriptDir

' Execute sync_amhv_all.js --sync silently (0 = vbHide, True = wait for completion)
cmd = "node.exe """ & scriptDir & "\sync_amhv_all.js"" --sync"
On Error Resume Next
objShell.Run cmd, 0, True

' Fallback to python launcher if needed
If Err.Number <> 0 Then
    Err.Clear
    cmd = "pyw.exe """ & scriptDir & "\sync_amhv_visual.py"" --sync"
    objShell.Run cmd, 0, True
End If
