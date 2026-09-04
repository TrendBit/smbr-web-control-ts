import { isArray, isNumber } from "../../../lib/web-components/other/utils"
import { ApiUnparsableBody, checkArray, checkNumber, sendJsonApiMessage, type apiMessageOptions } from "../apiMessageBase"

export namespace Sensor_Spectrophotometer{

    export type measureAllResult = {
        samples: {
            channel:number,
            relative_value: number,
            absolute_value: number
        }[]
    }
    
    export async function sendMeasureAll() : Promise<measureAllResult>{
        let opts : apiMessageOptions = {
            url: "/sensor/spectrophotometer/measure_all",
            method: "POST"
        }
        let result = await sendJsonApiMessage(opts)
    
        let data: {
            samples: {
                channel: number,
                relative_value: number,
                absolute_value: number
            }[]
        } = result.jsonValue
    
        checkArray(data,"samples",(element : any)=>{
            checkNumber(element,"channel",opts);
            checkNumber(element,"relative_value",opts);
            checkNumber(element,"absolute_value",opts);
            return true;
        },opts)
    
        return data
    }
}
