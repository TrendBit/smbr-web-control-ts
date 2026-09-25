# Changelog SMBR Web Control TS
This version number is trying to stick to the __MAJOR__.__MINOR__ identifiers but there are some exceptions (marked with a prefix # in the MINOR part).

# 1.2.0
- added version to modules in module list
- added system version to device info
- added a way to update the RPI using .swu update files via the device info widget
- added version control widget which support showing versions for services, modules and provides a way to update the system with .swu files
- added a way to edit the devices hostname (in the device information widget)
- added a display for REST-api version in the bottom left corner
- removed `/services-status` endpoint, as it was replaced by the REST api
- updated services status to use rest api endpoints (may result in the time sometimes not being displayed)

# 1.1.0
- added multiple other widget
- unified common ui components with other trendbit webapps
- added file search
- button tooltipls
- more smaller changes...

# 1.0.0
- full rewrite of the original [web-control](https://github.com/TrendBit/SMBR-web-control)
- most of the **bugs fixed**
- many optimalizations
- new tiling system, supporting **reorganization of widgets**, improved modularity and better performance
- new **text editor**
- added **pump module support**
- added **can statistics**
- better scrolling text visuals
- unified design
- **macros / quick launch widget rework**
- better error handling
- and many more changes...
