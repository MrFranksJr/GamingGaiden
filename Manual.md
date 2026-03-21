### Track PC games
1. Notify icon menu *Settings => Add Game*. 
2. Add the executable of game using *Add Exe*.
3. Icon should auto update. You can set a new icon by using *Search* (searches google for game icon) and *Update* (browse for image) buttons.
4. Change the auto populated *Name* to a better one and click *Ok*.

### Update tracked game status, edit play time, change icon etc.

App menu: *Settings => Edit Game*, select game from list (searchable).

- Change executable (after reinstall)
- Update icon (*Search* for online, *Update* to browse - png/jpg supported)
- Manually adjust play time
- Change platform
- Mark as finished / other status (checkbox)

### Pause/Resume game tracking

App menu: *Stop Tracker* to pause, *Start Tracker* to resume.

### Disable/Enable auto start

**Disable:** Press *Win+R*, enter *shell:startup*, delete *Gaming Gaiden* shortcut.

**Re-enable:** Run *install.bat* from install directory, choose *yes* for auto start.

### Restore data

1. App menu: *Settings => Open Install Directory*. Go to *backups* folder.
2. Exit app. 
3. Copy database file from inside one of the backup zips to install directory. 
4. Restart app.

### Track games on multiple PCs in a single Gaming Gaiden database

**Requires:** Cloud sync directory (OneDrive, etc.) accessible on all PCs.

1. Install app on all PCs. Pick PC with most data as initial database source.
2. On source PC: *Settings => Open Install Directory*, copy *backups* and *GamingGaiden.db* to synced folder.
3. Exit app on all PCs.
4. Delete *backups* and *GamingGaiden.db* from each PC's install directory.
5. Use [Link Shell Extension](https://schinagl.priv.at/nt/hardlinkshellext/linkshellextension.html) to create symbolic links (symlinks) from Gaming Gaiden install directory on each PC to the *GamingGaiden.db* file and the *backups* directory in synced folder.
6. Start app on all PCs.
7. Add both PCs in your "Gaming PCs" on Gaming Gaiden.
8. Mark PC as *current* in it's Gaming Gaiden app to track games and hours played on that PC.

### Map games played to the right gaming pc with single database on multiple PCs

After setting up database share make sure all PCs are added to Gaming Gaiden

Then, on each installation of Gaming Gaiden set the correct pc as current pc in *Settings => Gaming PCs* section.

Games will be tagged to the gaming pc on which they are played and pc usage will be updated using session times.
