import { createEffect, createSignal, onCleanup, onMount, Show } from 'solid-js'

import { sendApiMessageSimple, type apiMessageSimple } from '../../../lib/api-messages/apiMessageSimple';
import { refreshValueUpdate, useRefreshContext } from '../../../lib/web-components/other/RefreshProvider';
import { ValueDisplay, type ValueDisplayProps } from '../../../lib/web-components/ValueDisplay/ValueDisplay';

export interface ApiFetcherProps extends Omit<ValueDisplayProps,"value">{
    target: apiMessageSimple;
    minInterval?: number,
};


export function ApiFetcher(props: ApiFetcherProps) {
    const undefinedPlaceholder = "---"

    const [value, setValue] = createSignal<string | undefined>(undefinedPlaceholder);
    const [error, setError] = createSignal<boolean>(false);
    const refreshValue = useRefreshContext()
    
    let inProgress : boolean = false;
    let lastUpdate : number = 0;

    createEffect(async () => {
        let minInterval = (props.minInterval)? {
            length: props.minInterval, 
            lastUpdate: lastUpdate
        }:undefined;
        if(!refreshValueUpdate(refreshValue?.listen(), minInterval) || inProgress){
            return
        }
        lastUpdate = Date.now();
        inProgress = true;
        try {
            setValue(((await sendApiMessageSimple(props.target)).toString()));3
            setError(false);
        } catch (e) {
            setValue(undefined);
            setError(true);
            console.error(e);
        }
        inProgress = false;
    })

    return (
         <ValueDisplay
            value={value()}
            error={error()}
            {...props}
         ></ValueDisplay>
    );
}
