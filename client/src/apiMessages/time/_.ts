import { createSignal } from "solid-js";
import { checkNumber, checkTimestamp, sendJsonApiMessage, type apiMessageOptions } from "../apiMessageBase";

export namespace Time{
    export let [deviceTime, setDeviceTime] = createSignal<Date | undefined>(undefined)
    export let [deviceTimeOffset, setDeviceTimeOffset] = createSignal<number | undefined>(undefined)
    
    export async function getTime() : Promise<Date>{
        let opts : apiMessageOptions = {
            url: "/time",
            target: "webControlApi"
        }

        let sendTime = Date.now();

        let result = await sendJsonApiMessage(opts);
        let data = result.jsonValue;

        checkTimestamp(data,"serverTime",opts);

        let responseTime: Date = new Date(data.serverTime);
        let commEndTime = Date.now()
        let roundTripTime = commEndTime - sendTime;

        let time = new Date(responseTime.getTime() - (roundTripTime/2))

        setDeviceTime(time)
        setDeviceTimeOffset((responseTime.getTime() - commEndTime) - roundTripTime)
        
        return time
    }

    export type convertTime = {
        timestamp : string
    }

    export async function sendConvertTime(options : convertTime) : Promise<Date>{
        let opts : apiMessageOptions = {
            url: "/time/convert",
            target: "webControlApi",
            method: "POST",
            data: JSON.stringify({
                time: options.timestamp
            })
        }

        let result = await sendJsonApiMessage(opts);
        let data = result.jsonValue;

        checkNumber(data,"convertedTime",opts);

        return new Date(data.convertedTime);
    }
}