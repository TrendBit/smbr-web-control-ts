import { GridElement } from "../../components/GridstackGrid/GridstackGrid"
import { Widget } from "../common/Widget"
import { TableStatic, widgetHeightChange } from "../../../lib/web-components/Table/Table"
import { createSignal, createUniqueId, Show, type JSXElement } from "solid-js"
import { ApiFetcher } from "../../components/ApiFetcher/ApiFetcher"
import type { apiMessageSimple } from "../../apiMessages/apiMessageSimple"
import { Button } from "../../../lib/web-components/Button/Button"
import { Icon } from "../../components/Icon/Icon"
import { useModalWindow } from "../../../lib/web-components/ModalWindow/ModalWindow"
import styles from "./DeviceInformation.module.css"
import { System } from "../../apiMessages/system/_"
import { Services } from "../../apiMessages/services/_"
import { LoadingDots } from "../../../lib/web-components/LoadingDots/loadingDots"

interface DeviceInformationProps{
    id:string
}

type row = {
    label:string,
    value: apiMessageSimple,
    unit? : string,
    numberOnly?: boolean,
    prefix? : ()=>JSXElement
}

function renderRow(value : row, index : number){
    return ([
        <p style={{"justify-content":"left"}}>{value.label}</p>,
        <p style={{"justify-content":"right"}}>
            {value.prefix?.()}
            <ApiFetcher
                numberOnly={(value.numberOnly)?{decimalPlaces:2}:undefined}
                target={value.value}
                unit={value.unit}
            ></ApiFetcher>
        </p>
    ])
}

function HostnameEditor() {
    let modalWindowCntxt = useModalWindow()
    if (modalWindowCntxt === undefined) {
        throw Error("modal window context needed")
    }

    let newHostname = ""

    return (
        <Button flat={true} tooltip='change the hostname' callback={() => modalWindowCntxt.popup(() => (
            <div class={styles.modal}>
                <div class={styles.warning_text}>
                    <h4>Warning</h4>
                    <p>Changing the hostname will cause the device to <span class="bold">restart</span>. Please, make sure no experiments are currently running.</p>
                </div>
                <div class={styles.separator}>
                    <input
                        type="text"
                        class={"button "+styles.input}
                        placeholder="enter the new hostname..."
                        oninput={(e) => {
                            let value = e.target.value;
                            if (value.length > 8) {
                                e.target.value = value.slice(0,8)
                            }
                            newHostname = e.target.value
                        }}
                    >
                    </input>
                    <Button
                        tooltip="change the hostname and restart the device"
                        class={styles.submit_button}
                        callback={async () => {
                            await System.sendHostname(newHostname);
                            modalWindowCntxt.close()
                        }}
                    >
                        Submit & restart
                    </Button>
                </div>

            </div>
        ))}>
            <Icon name='edit'></Icon>
        </Button>
    )
}


export function DeviceInformation(props:DeviceInformationProps){
    const [rows,setRows] = createSignal<row[]>([
       {
            label: "SID",
            value: { url: "/core/sid", key: "sid" }
        },{
            label: "IP address",
            value: { url: "/core/ip_address", key: "ipAddress" }
        },{
            label: "Hostname",
            value: { url: "/core/hostname", key: "hostname" },
            prefix: HostnameEditor
        }, {
            label: "Serial number",
            value: { url: "/core/serial", key: "serial" }
        },{
            label: "Supply voltage",
            value: { url: "/core/supply/5v", key: "voltage" },
            unit: "V",
            numberOnly: true
        },{
            label: "Supply vin",
            value: { url: "/core/supply/vin", key: "voltage" },
            unit: "V",
            numberOnly: true
        },{
            label: "Supply poe",
            value: { url: "/core/supply/poe", key: "voltage" },
            unit: "V",
            numberOnly: true
        },{
            label: "Supply current",
            value: { url: "/core/supply/current", key: "current" },
            unit: "A",
            numberOnly: true
        },{
            label: "Supply power_draw",
            value: { url: "/core/supply/power_draw", key: "power_draw" },
            unit: "W",
            numberOnly: true
        },{
            label: "System version",
            value: { url: "/system/version", key: "version" },
        }
    ])
    const [error, setError] = createSignal<string | undefined>();
    const [selectedFile, setSelectedFile] = createSignal<File | undefined>()
    const fileInputID = createUniqueId()
    const modalWindowCntxt = useModalWindow()
    if (modalWindowCntxt === undefined) {
        throw Error("Modal window context required")
    }

    const [uploading, setUploading] = createSignal<boolean>(false);

    async function update() {
        try {
            const file = selectedFile()

            if (file === undefined) {
                throw Error("no file selected")
            }
            setUploading(true)
            await Services.sendSwuUpdate(file)
            modalWindowCntxt?.close()
        } catch (e) {
            modalWindowCntxt?.close()
            if (e instanceof Error) {
                setError(e.message)
            }
            throw e
        }
    }

    function uploadButtonInsides(inProgress : boolean) {
        if (inProgress) {
            return (
                <span>uploading file<LoadingDots></LoadingDots></span>
            )
        } else {
            return "proceed with update"
        }
    }

    function modalWindow() {
        return (
            <div class={styles.modal_window}>
                <h4>System update</h4>
                <div class={styles.modal_info}>
                    <p>The update can take <span class="bold">several minutes</span> and will go through the following steps:</p>
                    <ul>
                        <li>upload the selected file to the server</li>
                        <li>apply the update</li>
                        <li>restart the device</li>
                        <li>update connected modules</li>
                        <li>reload web control interface</li>
                    </ul>
                </div>
                <div class={styles.modal_warning}>
                    <Icon name="error"></Icon>
                    <p>Updating the device will make it <span class="bold">restart</span>. Make sure no experiments are running.</p>
                </div>
                <Button callback={update} tooltip="upload the selected file to server and start the update">{uploadButtonInsides(uploading())}</Button>
            </div>
        )
    }


    async function selectFile(files: FileList | null | undefined) {
        try {
            if (files === null || files === undefined) {
                throw Error("no file selected")
            }
            if (files.length > 1) {
                throw Error("mutliple files selected")
            }
            let file = files[0]
            if (!file.name.endsWith(".swu")) {
                throw Error("file has to be an .swu")
            }
            setSelectedFile(file)
            setUploading(false)

            await modalWindowCntxt?.popup(modalWindow, true)

            setSelectedFile(undefined)

        } catch (e) {
            if (e instanceof Error) {
                setError(e.message)
            }
            throw e
        }
    }

    function onInputChange(e: Event) {
        setError(undefined)
        const input = e.currentTarget as HTMLInputElement
        selectFile(input.files)
        // reset so picking the same file again re-triggers onInput
        input.value = ""
    }

    const handleDragOver = (e: DragEvent) => {
        setError(undefined)
        setSelectedFile(undefined)
        e.preventDefault();
    };

    const handleDragLeave = (e: DragEvent) => {
        setError(undefined)
        e.preventDefault();
    };

    const handleDrop = (e: DragEvent) => {
        setError(undefined)
        e.preventDefault();
        selectFile(e.dataTransfer?.files)
    };

    return (
        <GridElement id={props.id} w={1} h={widgetHeightChange(rows().length, {addedPixels: 160})}>
            <Widget name="Device information">
                <TableStatic
                    data={rows()}
                    headers={["field","value"]}
                    colSizes={[undefined,"150px"]}
                    renderRow={renderRow}
                    fillHeight={true}
                ></TableStatic>
                <div class={styles.update}>

                    <label
                        classList={{
                            [styles.error]: error() !== undefined
                        }}
                        class={styles.file_input}

                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >


                        <input
                            type="file"
                            id={fileInputID}
                            accept=".swu"
                            hidden
                            onInput={onInputChange}
                        />
                        <Show when={error() === undefined}
                            fallback={
                                <>
                                    <p>Cannot update:</p>
                                    <p>{error()}</p>
                                </>
                            }
                        >
                            <Show when={selectedFile() === undefined}
                                fallback={
                                    <>
                                        <p>{selectedFile()?.name}</p>
                                        <p>({selectedFile()?.size} Bytes)</p>
                                    </>
                            }>
                                <h4>System update</h4>
                                <p>drop .swu file here</p>
                                <div class={styles.updates_separator}>
                                    <div></div>
                                    <p>or</p>
                                    <div></div>
                                </div>
                                <p>click to browse local files</p>
                            </Show>
                        </Show>
                    </label>
                </div>
            </Widget>
        </GridElement>
    )
}
