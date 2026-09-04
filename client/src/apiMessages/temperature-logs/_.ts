import { isNumber } from "chart.js/helpers"
import { checkArray, checkNumber, checkString, sendJsonApiMessage, type apiMessageOptions } from "../apiMessageBase"
import { isNull } from "../../../lib/web-components/other/utils"

export namespace TemperatureLogs{
    export type Logs = Record<string,(number|undefined)[]>

    export type getLogsResult = {
        logs: Logs,
        logCount: number,
        historyLen: number,
        toCycle : number
    }

    export type getLogs = {
        fromCycle: number,
        scope : "M"| "H" | "D"
    }

    export async function sendGetLogs(options : getLogs) : Promise<getLogsResult>{
        let opts : apiMessageOptions = {
            url: "/temperature-logs",
            target: "webControlApi",
            data:JSON.stringify({
                fromCycle : options.fromCycle,
                scope : options.scope
            }),
            method: "POST"
        }

        let response = await sendJsonApiMessage(opts);
        let data = response.jsonValue;

        let result : Logs = {};

        checkArray(data,"logs",(el)=>{
            checkString(el,"endpoint",opts);
            let resultPart : (number|undefined)[] = [];
            checkArray(el,"values",(el)=>{
                if(isNumber(el)){
                    resultPart.push(el);
                    return true;
                }
                if(isNull(el)){
                    resultPart.push(undefined);
                    return true;
                }

                return false;
            },opts);

            result[el.endpoint] = resultPart;

            return true
        },opts);
        checkNumber(data,"logCount",opts);
        checkNumber(data,"historyLen",opts);
        checkNumber(data,"toCycle",opts);

        return {
            logs: result,
            logCount: data.logCount,
            historyLen: data.historyLen,
            toCycle: data.toCycle
        }
    }
}
