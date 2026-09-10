import { createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js';
import { ApiFetcher } from '../../components/ApiFetcher/ApiFetcher'
import { formatTime } from '../../../lib/web-components/other/utils';

import styles from './Hotbar.module.css'
import { sendApiMessageSimple, type apiMessageSimple } from '../../../lib/api-messages/apiMessageSimple';
import { refreshValueUpdate, useRefreshContext } from '../../../lib/web-components/other/RefreshProvider';
import { ValueDisplay } from '../../../lib/web-components/ValueDisplay/ValueDisplay';
import { System } from '../../../lib/api-messages/system/_';
import { Time } from '../../../lib/api-messages/time/_';
import { countInstancesOfType, useModuleListValue } from '../../components/other/ModuleListProvider';
import { reactorApiTarget } from '../../../lib/api-messages/apiMessageConfig';


type SimpleDisplayProps = {
    name: string,
    target: apiMessageSimple,
};

function SimpleDisplay({ name, target }: SimpleDisplayProps) {
    return (
        <div class={styles.twoRowContainer + " " + styles.bold}>
            <p>{name+ ":"}</p>
            <ApiFetcher target={target}></ApiFetcher>
        </div>
    )
}

function HostnameDisplay(){
    const refreshCntxt = useRefreshContext();
    const [value, setValue] = createSignal<string | undefined>(undefined);
    const [error, setError] = createSignal<boolean>(false);

    createEffect(async ()=>{
        if(!refreshValueUpdate(refreshCntxt?.listen())){
            return
        }
        try {
            let result = await sendApiMessageSimple({
                url: "/core/hostname", 
                key: "hostname",
                target:reactorApiTarget
            });
            setError(false);
            setValue(result.toString());
        
            document.title = `[${result.toString()}]: SMBR-web-control`;
        } catch (error) {
            setError(true);
            setValue(undefined);
            
            document.title = `SMBR-web-control`;
            throw error;
        }
    })

    return (
        <div class={styles.twoRowContainer + " " + styles.bold}>
            <p>{"hostname:"}</p>
            <ValueDisplay
                value={value()}
                error={error()}
            ></ValueDisplay>
        </div>
    )
}

export function Hotbar() {
    const [time, setTime] = createSignal<{time: Date|undefined, error: boolean}>({time:undefined,error:false});
    const [serverTimeOffset , setServerTimeOffset] = createSignal<number|undefined>(undefined);
    const moduleListCntxt = useModuleListValue();
    const refreshCntxt = useRefreshContext();
    const [countsErrs, setCountsErrs] = createSignal<{err: boolean, count: number | undefined}>({err:false,count:undefined});
    const [countsWarns, setCountsWarns] = createSignal<{err: boolean, count: number | undefined}>({err:false,count:undefined});
    const [error, setError] = createSignal<boolean>(false);

    onMount(()=>{
        let id = setInterval(()=>{
            let offset = serverTimeOffset();
            if(offset!==undefined){
                setTime({
                    time: new Date(Date.now()+offset),
                    error: false
                })
            }else{
                setTime({
                    time: undefined,
                    error: true
                });
            }
        },100)

        onCleanup(()=>{
            clearInterval(id);
        })
    })

    async function refreshCountsErrs(){
        try {
            setCountsErrs({
                err: false,
                count: (await System.sendErrors()).problems.length
            });
        } catch (error) {
            setCountsErrs({
                err: true,
                count: undefined
            });
            throw error
        }
        
    }
    async function refreshCountsWarns(){
        try {
            setCountsWarns({
                err: false,
                count: (await System.sendWarnings()).problems.length
            });
        } catch (error) {
            setCountsWarns({
                err: true,
                count: undefined
            });
            throw error
        }
    }
    async function refreshTimeOffset(){
        try {
            let response = await Time.getTime();
            setServerTimeOffset(Date.now() - response.getTime())
        } catch (error) {
            setServerTimeOffset(undefined)
            throw error
        }
    }

    createEffect(async ()=>{
        if(!refreshValueUpdate(refreshCntxt?.listen())){
            return;
        }

        refreshCountsErrs();
        refreshCountsWarns();
        refreshTimeOffset();
    })

    return (
        <>
            <div classList={{
                [styles.state_display]:true,
                [styles.twoRowContainer]:true,
                [styles.errors]:    (countsErrs().count  ?? 0) > 0,
                [styles.warnings]:  (countsWarns().count ?? 0) > 0
            }}
            >
                <div class={styles.flex_row + " " + styles.bold}>
                    <p>Errors: </p>
                    <ValueDisplay 
                        value={countsErrs().count?.toString()}
                        error={countsErrs().err}
                    ></ValueDisplay>
                </div>
                <div class={styles.flex_row + " " + styles.bold}>
                    <p>Warnings: </p>
                    <ValueDisplay 
                        value={countsWarns().count?.toString()}
                        error={countsWarns().err}
                    ></ValueDisplay>
                </div>
            </div>
            <div 
                class={styles.twoRowContainer}
                style={{width: "80px"}}
            >
                <ValueDisplay
                    value={(time().time===undefined)?undefined:formatTime("hh:MM",time().time)}
                    error={time().error}
                ></ValueDisplay>
                <ValueDisplay
                    value={(time().time===undefined)?undefined:formatTime("dd.mo. yyyy",time().time)}
                    error={time().error}
                ></ValueDisplay>
            </div>      
            <Show when={countInstancesOfType(moduleListCntxt?.state(),"core","Exclusive")}>
                <HostnameDisplay></HostnameDisplay>
                <SimpleDisplay name='IP adress' target={{ url: "/core/ip_address", key: "ipAddress" , target:reactorApiTarget}}></SimpleDisplay>
                <SimpleDisplay name='short ID' target={{url: "/core/sid", key: "sid", target:reactorApiTarget}}></SimpleDisplay>
            </Show>  
        </>
    )
}
