import { createEffect, createSignal } from "solid-js";
import { sendApiMessageSimple, sendApiMessageSimplePost, type apiMessageSimple } from "../../apiMessages/apiMessageSimple";
import { refreshValueUpdate, useRefreshContext } from "../../../lib/web-components/other/RefreshProvider";
import { isNumber } from "chart.js/helpers";
import { ValueController } from "../../../lib/web-components/ValueController/ValueControlller";

interface ValueControllerApiControl{
    title : string,
    valueName : string,
    buttonText : string,
    unit? : string,
    buttonTooltip : string

    getter: apiMessageSimple,
    setter?: apiMessageSimple,

    getValueFunction? : ()=>Promise<number | undefined>

    onClick: (value: number | undefined) => Promise<void>

    min?: number;
    max?: number;
}

export function ApiValueController(props : ValueControllerApiControl){
    const [value, setValue] = createSignal<number | undefined>(undefined);
    const [error, setError] = createSignal<boolean>(false);
    const refreshCntx = useRefreshContext();

    async function refreshValue(){
        try {
            if(props.getValueFunction){
                setValue(await props.getValueFunction());
                setError(false);
            }else{
                let response = await sendApiMessageSimple(props.getter);
                if(isNumber(response)){
                    setValue(response);
                    setError(false);
                }else{
                    throw Error("invalid return value");
                }
            }
        } catch (error) {
            setError(true);
            setValue(undefined);
            throw error;
        }
    }

    createEffect(async ()=>{
        if(!refreshValueUpdate(refreshCntx?.listen())){
            return
        }
        await refreshValue();
    })

    async function onSubmit(value: number | undefined){
        let response = await sendApiMessageSimplePost(props.setter ?? props.getter,value);
        await refreshValue();
    }
    async function onClick(){
        await props.onClick(value());
        await refreshValue();
        return true;
    }

    return (
        <ValueController
            title={props.title}
            valueName={props.valueName}
            buttonText={props.buttonText}
            buttonTooltip={props.buttonTooltip}

            unit={props.unit}
            min={props.min}
            max={props.max}

            getter={value}
            setter={(value)}

            onClick={onClick}

            onSubmit={onSubmit}

            error={error()}
        
        ></ValueController>
    )
}
