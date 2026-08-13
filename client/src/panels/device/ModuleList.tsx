import { createEffect, createSignal } from "solid-js";
import { GridElement } from "../../components/GridstackGrid/GridstackGrid"
import { instanceToIndex, useModuleListValue, type Module } from "../../components/other/ModuleListProvider";
import { TableStatic, widgetHeightChange } from "../../common/web-components/Table/Table";
import { Widget } from "../common/Widget";
import { Button } from "../../common/web-components/Button/Button";
import { Icon } from "../../components/Icon/Icon";
import { ApiFetcher } from "../../components/ApiFetcher/ApiFetcher";
import { sendApiMessageSimplePost } from "../../apiMessages/apiMessageSimple";
import { System } from "../../apiMessages/system/_";
import { sleep } from "../../common/web-components/other/utils";
import { getModuleEndpoint } from "../../apiMessages/utils";


async function restartModule(module: Module){
    await sendApiMessageSimplePost({url:getModuleEndpoint(module,"/restart"),key:"uid"},module.uid);
    await sleep(3000);
    return true
}


function renderRow(value : Module, index: number){

    return([
        <p>{value.type}</p>,
        <p>{value.uid}</p>,
        <p>{value.instance}</p>,
        <ApiFetcher
            numberOnly={{decimalPlaces: 2}}
            target={{url: getModuleEndpoint(value,"/ping") ,key: "time_ms"}}
            unit="ms"
        ></ApiFetcher>,
        <ApiFetcher
            numberOnly={{decimalPlaces: 2}}
            target={{url: getModuleEndpoint(value,"/core_temp") ,key: "temperature"}}
            unit="°C"
        ></ApiFetcher>,
        <ApiFetcher
            numberOnly={{decimalPlaces: 2}}
            target={{url: getModuleEndpoint(value,"/board_temp") ,key: "temperature"}}
            unit="°C"
        ></ApiFetcher>,
        <ApiFetcher
            numberOnly={{
                decimalPlaces: 2,
                resultModifier: (value:number)=>(value*100)
            }}
            target={{url: getModuleEndpoint(value,"/load") ,key: "load"}}
            unit="%"
        ></ApiFetcher>,
        <Button
            tooltip="Restart this module"
            callback={()=>restartModule(value)}
        >
            <Icon scale={1.4} name="refresh"></Icon>
        </Button>
    ])
}

interface ModuleListDisplayProps{
    id : string
}

interface ModuleListDisplayBodyProps extends ModuleListDisplayProps{
    rowNumSetter : (value:number)=>void
}

export function ModuleListDisplayBody(props : ModuleListDisplayBodyProps){
    const [rows, setRows] = createSignal<Module[]>([]);
    const moduleListCntxt = useModuleListValue();

    createEffect(()=>{
        if(moduleListCntxt){
            let new_rows : Module[] = [];
            for(let module of moduleListCntxt.state()){
                new_rows.push({
                    type: module.type,
                    uid: module.uid,
                    instance: module.instance
                })
            }
            setRows(new_rows);
        }
    })

    createEffect(()=>{
        props.rowNumSetter(rows().length);
    })



    return (
        <TableStatic
            headers={["name","id","instance","ping","core temperature","module temperature","CPU load","reset"]}
            data={rows()}
            colSizes={["90px","150px","130px",undefined,undefined,undefined,undefined,"35px"]}
            renderRow={renderRow}
            fillHeight={true}
        ></TableStatic>
    )
}

export function ModuleListDisplay(props : ModuleListDisplayProps){
    const [rowNum, setRowNum] = createSignal(0);

    return (
        <GridElement id={props.id} h={widgetHeightChange(rowNum(),{rowHeight: 30})} w={2}>
            <Widget name="Module list">
                <ModuleListDisplayBody rowNumSetter={setRowNum} {...props}></ModuleListDisplayBody>
            </Widget>
        </GridElement>
    )
}
