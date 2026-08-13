import { checkArray, checkBoolean, checkNull, checkNumber, checkString, checkStringEnum, checkTimestamp, sendJsonApiMessage, type apiMessageOptions } from "../apiMessageBase"
import { HandleDeviceRestart } from "../../components/other/DeviceRestartHandler"

export namespace Services{
    export type stateTypes =  "ok" | "problem" | "critical-problem"

    export type serviceStatus = {
        name : string,
        loadState : string,
        activeState : string,
        subState : string,
        enabled : boolean,
        mainPid : number,
        since : Date,
        stateType: stateTypes
    }

    export type servicesStatusResult = {
        services: serviceStatus[]
    }

    export async function sendServicesStatus() : Promise<servicesStatusResult>{
        let opts : apiMessageOptions = {
            url: "/services"
        }

        let result = await sendJsonApiMessage(opts);
        let data = { services: result.jsonValue };

        let parsedData : serviceStatus[] = [];

        checkArray(data,"services",(el)=>{
            checkString(el,"name",opts);
            checkString(el,"load_state",opts);
            checkString(el,"active_state",opts);
            checkString(el,"sub_state",opts);
            checkBoolean(el,"enabled",opts);
            checkNumber(el,"main_pid",opts);
            checkTimestamp(el, "since", opts);

            let stateType : stateTypes
            switch(el.active_state){
                case "active":
                    stateType = "ok"
                    break
                case "not installed":
                case "failed":
                case "inactive":
                    stateType = "critical-problem"
                    break
                default:
                    stateType = "problem"
            }

            parsedData.push({
                name: el.name,
                loadState: el.load_state,
                activeState: el.active_state,
                subState: el.sub_state,
                enabled: el.enabled,
                mainPid: el.main_pid,
                since: new Date(el.since),
                stateType: stateType
            })

            return true;
        },opts);

        return {services: parsedData};
    }

    export async function sendSwuUpdate(updateFile: File): Promise<void>{
        if (!updateFile.name.endsWith(".swu")) {
            throw Error("update file must be .swu")
        }

        let opts : apiMessageOptions = {
            url: "/services/swupdate/update",
            contentType: "application/octet-stream",
            method: "POST",
            validStatusCodes: [200,202],
            data: await updateFile.arrayBuffer()
        }

        let result = await sendJsonApiMessage(opts);

        HandleDeviceRestart({
            firmware: true
        })
    }

}
