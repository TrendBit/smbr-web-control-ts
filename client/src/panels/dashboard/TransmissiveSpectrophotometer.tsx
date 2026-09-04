import { GridElement } from "../../components/GridstackGrid/GridstackGrid"
import { TableStatic, widgetHeightChange } from "../../../lib/web-components/Table/Table";
import { Widget } from "../common/Widget";
import { Icon } from "../../components/Icon/Icon";
import { createEffect, createSignal, onMount } from "solid-js";
import { Button } from "../../../lib/web-components/Button/Button";
import { refreshValueUpdate, useRefreshContext } from "../../../lib/web-components/other/RefreshProvider";
import { ValueDisplay } from "../../../lib/web-components/ValueDisplay/ValueDisplay";
import { Sensor_Spectrophotometer } from "../../apiMessages/sensor/spectrophotometer";
import { sendApiMessage } from "../../apiMessages/apiMessageBase";

interface TransSpectrophotometerProps{
    id: string;
}

type row = {
    color: string,
    frequency: number,
    name: string,
    absolue_value: string,
    relative_value: string,
}


function TransSpectrophotometerBody(
    props : {
        widgetProps: TransSpectrophotometerProps, 
        rowNumSetter : (value: number)=>void
    }
){
    const channelDictionary = [
        {color:"#6F00FF",frequency:430,name:"UV"},
        {color:"#007FFF",frequency:480,name:"Blue"},
        {color:"#00FF00",frequency:560,name:"Green"},
        {color:"#FF7F00",frequency:630,name:"Orange"},
        {color:"#FF0000",frequency:678,name:"Red"},
        {color:"#800000",frequency:870,name:"IR"},
    ];
    const [rows, setRows] = createSignal<row[]>([])
    
    const [error, setError] = createSignal<boolean>(false);
    const refreshValue = useRefreshContext()
    
    function setRowsToUndefined(){
        let newRows = []
        for(let index in channelDictionary){
            let channelDictRes = channelDictionary[index]
            newRows.push({
                color: channelDictRes.color,
                frequency: channelDictRes.frequency,
                name: channelDictRes.name,
                absolue_value: "---",
                relative_value: "---"
            })
        }
        setRows(newRows)
        setError(false);
    }

    onMount(()=>{
        setRowsToUndefined();
    })

    function renderRow(value : row, index: number){
        return ([
            <Icon name="circle" color={value.color}></Icon>,
            <p>{value.frequency + " nm"}</p>,
            <p style={{"justify-content":"left"}}>{value.name}</p>,
            <ValueDisplay
                value={value.absolue_value}
                numberOnly={{
                    decimalPlaces: 0
                }}
                error={error()}
            ></ValueDisplay>,
            <ValueDisplay
                value={value.relative_value}
                unit="%"
                numberOnly={{
                    decimalPlaces: 1,
                    resultModifier(value) {
                        return value*100
                    },
                }}
                error={error()}
            ></ValueDisplay>
        ])
    }

    let inProgress = false;
    let lastUpdate = 0;

    createEffect(async ()=>{
        if(!refreshValueUpdate(refreshValue?.listen(),{length:12000,lastUpdate:lastUpdate}) || inProgress){
            return
        }
        lastUpdate = Date.now();
        inProgress = true;
        try {
            let response = await Sensor_Spectrophotometer.sendMeasureAll();
            let newRows : row[] = []
            for(let channel of response.samples){
                let channelDictRes = channelDictionary[channel.channel]
                newRows.push({
                    color: channelDictRes.color,
                    frequency: channelDictRes.frequency,
                    name: channelDictRes.name,
                    absolue_value: channel.absolute_value.toString(),
                    relative_value: channel.relative_value.toString()
                })
            }
            setRows(newRows);
            setError(false);
        } catch (error) {
            setError(true);
            console.error(error);
        }
        inProgress = false;
    })

    createEffect(()=>{
        props.rowNumSetter(rows().length);
    })

    return (
        <>
            <TableStatic
                data={rows()}
                headers={["color","frequency","name","absolute","relative"]}
                colSizes={["35px","70px",undefined,"50px","50px"]}
                renderRow={renderRow}
                fillHeight={true}

            ></TableStatic>
            <div style={{
                flex: "0 0 auto",
                display: "flex",
                "justify-content": "end",
                "align-items": "end",
                "flex-direction": "column",
                "padding-top": 0
            }}>
                <Button 
                    callback={async ()=>{
                        await sendApiMessage({url:"/sensor/spectrophotometer/calibrate",method:"POST",data:"{}"});
                        return true;
                    }}
                    tooltip="Sets the current absolute values as reference for relative"
                >set reference</Button>
            </div>
        </>
    )
}


export function TransSpectrophotometer(props: TransSpectrophotometerProps) {
    const [rowNum, setRowNum] = createSignal(1);

    return (
        <GridElement id={props.id} w={1} h={widgetHeightChange(rowNum(),{addedPixels:35})}>
            <Widget name="Transmissive spectrophotometer">
                <TransSpectrophotometerBody
                    widgetProps={props}
                    rowNumSetter={setRowNum}
                ></TransSpectrophotometerBody>
            </Widget>
        </GridElement>
    )
}
