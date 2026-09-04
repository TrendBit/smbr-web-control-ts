import { createSignal, onMount, Show, type JSXElement } from "solid-js"
import { useModalWindow } from "../../../lib/web-components/ModalWindow/ModalWindow"
import { LoadingDots } from "../../../lib/web-components/LoadingDots/loadingDots"
import { sendApiMessage, sendJsonApiMessage } from "../../../lib/api-messages/apiMessageBase"
import { smbr_apiMessageConfig } from "../../../lib/api-messages/apiMessageConfig"
import { sleep } from "../../../lib/web-components/other/utils"
import { globalModalWindow } from "./GlobalModalWindow"
import { mainUpdaterDisabled } from "../../App"
import styles from "./DeviceRestartHandler.module.css"

type Changes = {
    hostname?: string,
    firmware?: true
}

export async function HandleDeviceRestart(changes: Changes = {}) {
    if (globalModalWindow.cntxt === undefined) {
        throw Error("Global modal window context needed")
    }

    await globalModalWindow.cntxt.popup(()=>ModalPopup(changes),false)
}

type Pages =
    "updating rpi" |
    "initializing" |
    "updating modules" |
    "restarting" |
    "completed firmware update" |
    "completed restart"

function ModalPopup(changes: Changes) {
    const [currPage, setCurrPage] = createSignal<Pages>("initializing")
    const pages: Record<Pages, JSXElement> = {
        "initializing": <>
            <h4>Preparing for restart<LoadingDots></LoadingDots></h4>
        </>,
        "updating rpi" : <>
            <h4>Updating rpi<LoadingDots></LoadingDots></h4>
            <p class={styles.info}>Please wait, this can take a few minutes.</p>
        </>,
        "updating modules" : <>
            <h4>Restarting and updating modules<LoadingDots></LoadingDots></h4>
            <p class={styles.info}>Please wait, this can take a few minutes.</p>
        </>,
        "restarting" : <>
            <h4>Restarting<LoadingDots></LoadingDots></h4>
            <p class={styles.info}>This should take about one minute.</p>
        </>,
        "completed firmware update": <>
            <h4>Finnished updating</h4>
            <p>Web control will reload in 5 seconds<LoadingDots></LoadingDots></p>
        </>,
        "completed restart": <>
            <h4>Finnished restarting</h4>
            <Show when={changes.hostname}>
                <p class={styles.info}>Hostname of the device has changed. Web control is able to still comunicate with it, but it is recommended to move to the new device url.</p>
                <button class="button" onclick={redirect}>move to new url</button>
            </Show>
        </>
    }
    let targetHostname = ""

    function redirect() {
        window.location.href = `${window.location.protocol}//${targetHostname}:${80}`;
    }

    function reload() {
        const url = new URL(window.location.href);
        url.searchParams.set('t', Date.now().toString());

        window.location.href = url.toString();
    }

    onMount(async () => {
        setCurrPage("initializing")

        let originalUpdateState = mainUpdaterDisabled.get()
        mainUpdaterDisabled.set(true)

        let deviceIsDown = true
        targetHostname = smbr_apiMessageConfig.defaultHostnames.reactorApi

        await sleep(3000)

        if (changes.firmware) {
            setCurrPage("updating rpi")
            let deviceIsUp = true;
            while (deviceIsUp) {
                await sleep(1000)
                try {
                    console.log("sending probe to device")
                    await sendJsonApiMessage({
                        url: "/system/modules",
                        hostname: targetHostname,
                        timeout: 1000
                    })
                    console.log("device still up")
                } catch (e) {
                    deviceIsUp = false;
                    console.log("device started to restart")
                }
            }
            setCurrPage("updating modules")
        }

        if (changes.hostname) {
            targetHostname = changes.hostname+".local"
            setCurrPage("restarting")
        }


        while (deviceIsDown) {
            await sleep(1000)
            try {
                console.log("sending probe to device")
                await sendJsonApiMessage({
                    url: "/system/modules",
                    hostname: targetHostname,
                    timeout: 1000
                })
                console.log("device finished restarting!!")
                deviceIsDown = false;
            } catch (e) {
                console.log("still waiting, error: ",e)
            }
        }

        globalModalWindow.cntxt?.closeButton.set(true)

        if (changes.hostname) {
            smbr_apiMessageConfig.defaultHostnames.reactorApi = targetHostname;
            smbr_apiMessageConfig.defaultHostnames.webControlApi = targetHostname;
            setCurrPage("completed restart")
        }

        if (changes.firmware) {
            setCurrPage("completed firmware update")
            await sleep(5000)
            reload()
        }

        mainUpdaterDisabled.set(originalUpdateState)
    })

    return (
        <div class={styles.container}>
            {pages[currPage()]}
        </div>
    )
}
