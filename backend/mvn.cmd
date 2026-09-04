@echo off
setlocal
REM Wrapper: always uses local maven-settings.xml (Maven Central), never corporate mirror.
set "SCRIPT_DIR=%~dp0"
if not defined JAVA_HOME set "JAVA_HOME=C:\Program Files\Eclipse Adoptium\jdk-21.0.10.7-hotspot"
set "PATH=%JAVA_HOME%\bin;%PATH%"
mvn -s "%SCRIPT_DIR%maven-settings.xml" %*
exit /b %ERRORLEVEL%
