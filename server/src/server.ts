import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';
import chalk from 'chalk';
import cors from 'cors';
import { configFilesRouter } from './config-endpoints.js';
import { TempLogger } from './temperature-history.js';
import fs from 'fs';
import { isNumber, isString } from './utils.js';
import { smbr_config } from './config.js';
import { timeModulesRouter } from './time-module.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, '..', '..', '..', 'client', 'dist');




{
    //colors all error outputs RED and warn outputs in YELLOW and debug in GREY (debug is not printed at all when verbose mode isn't on)
    function pad(num : number, size: number) : string {
        let s : string = num.toString();
        while (s.length < size){
            s = "0" + s;
        }
        return s;
    }

    function consoleTimestamp(): string{
        let time : Date = new Date();
        return chalk.gray(
            `[${pad(time.getHours(),2)}:`+
            `${pad(time.getMinutes(),2)}:`+
            `${pad(time.getSeconds(),2)}:`+
            `${pad(time.getMilliseconds(),3)}]`
        ) 
    }

    const originalLog = console.log;
    console.log = (...args) => {
        originalLog(consoleTimestamp(),...args);
    };

    const originalError = console.error;
    console.error = (...args) => {
        originalError(consoleTimestamp(),chalk.red(...args));
    };

    const originalWarn = console.warn;
    console.warn = (...args) => {
        originalWarn(consoleTimestamp(),chalk.yellow(...args));
    };

    const originalDebug = console.debug;
    console.debug = (...args) => {
        if (verboseMode){
            originalDebug(consoleTimestamp(),chalk.gray(...args));
        }
    };
}


let debugMode = false;
let verboseMode = false;
let noFrontEnd = false;
process.argv.forEach(function (val, index, array) {
    if(val == "-d"){
        console.warn("Running in DEBUG MODE");
        debugMode = true;
        try {
            let pathToConfig = path.join(__dirname,"..","..","..","server_config.json");
            let configFile = fs.readFileSync(pathToConfig);
            let configContent = JSON.parse(configFile.toString());
            if(isString(configContent.targetHostname)){
                smbr_config.defaultHostname = configContent.targetHostname;
                console.warn("target hostname changed to:",configContent.targetHostname);
            }
            if(isString(configContent.configFilesTarget)){
                smbr_config.configFilesTarget = configContent.configFilesTarget;
                console.warn("config files target changed to:",configContent.configFilesTarget);
            }
            if(isNumber(configContent.port)){
                smbr_config.port = configContent.port;
                console.warn("port changed to:",configContent.port);
            }
        } catch (error) {
            console.warn("missing or invalid config file \"server_config.json\", error: \n",error);
        }
    }
    if(val == "-v"){
        console.warn("Running in VERBOSE MODE");
        verboseMode = true;
    }
    if(val == "--no-frontend"){
        console.warn("Running in NO FRONTEND MODE");
        noFrontEnd = true;
    }
});






const tempLogger : TempLogger = new TempLogger(80);

const app = express();
app.use(cors()); 
app.use(express.json());
app.use(express.static(distPath));
app.use('/config-files', configFilesRouter);
app.use('/temperature-logs', tempLogger.router);
app.use('/time',timeModulesRouter);

if(!noFrontEnd){
    app.use((req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
    });
}


app.listen(smbr_config.port, () => {
    console.log(`Server running on http://localhost:${smbr_config.port}`);
});