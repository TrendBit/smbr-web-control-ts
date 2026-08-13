import { Show, createEffect, createSignal, createUniqueId } from "solid-js";
import { GridElement } from "../../components/GridstackGrid/GridstackGrid";
import { Widget } from "../common/Widget";
import type { apiMessageSimple } from "../../apiMessages/apiMessageSimple";
import { TableStatic, widgetHeightChange } from "../../components/Table/Table";
import { ApiFetcher } from "../../components/ApiFetcher/ApiFetcher";
import { ValueDisplay } from "../../common/web-components/ValueDisplay/ValueDisplay";
import { max } from "../../common/web-components/other/utils";
import { instanceToIndex, moduleInstanceColors, useModuleListValue, type moduleInstancesType, type moduleTypesType } from "../../components/other/ModuleListProvider";
import { refreshValueUpdate, useRefreshContext } from "../../common/web-components/other/RefreshProvider";
import { getModuleEndpoint } from "../../apiMessages/utils";
import styles from "./SystemUpdate.module.css"
import { Button } from "../../common/web-components/Button/Button";
import { useModalWindow } from "../../common/web-components/ModalWindow/ModalWindow";
import { Icon } from "../../components/Icon/Icon";
import { Services } from "../../apiMessages/services/_";
import { LoadingDots } from "../../common/web-components/LoadingDots/loadingDots";

interface SystemUpdateProps {
    id: string
}

interface SystemUpdateBodyProps extends SystemUpdateProps{
    rowLenSetter: (value : number) => void
}

type ModuleRow = {
    type: moduleTypesType,
    instance: moduleInstancesType,
    sf_version: apiMessageSimple,
    hw_version: apiMessageSimple
}

type SystemRow = {
    service: string,
    version: apiMessageSimple
}

function renderModuleRow(row: ModuleRow, index: number) {
    let instance = instanceToIndex[row.instance]
    let module_id = `${row.type} ${(instance!==0)?"("+instance.toString()+")":""}`
    return [
        <p style={{color: moduleInstanceColors[row.instance]}}>{module_id}</p>,
        <ApiFetcher minInterval={15000} target={row.hw_version}></ApiFetcher>,
        <ApiFetcher minInterval={15000} target={row.sf_version}></ApiFetcher>,
    ]
}

function renderSystemRow(row: SystemRow, index: number) {
    return [
        <p>{row.service}</p>,
        <ApiFetcher minInterval={15000} target={row.version}></ApiFetcher>,
    ]
}

export function SystemUpdateBody(props: SystemUpdateBodyProps) {
    const [moduleRows, setModuleRows] = createSignal<ModuleRow[]>([])
    const [systemRows, setSystemRows] = createSignal<SystemRow[]>([
        {service: "REST-api", version: {url: "/system/version", key: "version"}}
    ])
    const [error, setError] = createSignal<string | undefined>();
    const [selectedFile, setSelectedFile] = createSignal<File | undefined>()
    const moduleListCntxt = useModuleListValue()
    const fileInputID = createUniqueId()
    const modalWindowCntxt = useModalWindow()
    if (modalWindowCntxt === undefined) {
        throw Error("Modal window context required")
    }

    const [uploading, setUploading] = createSignal<boolean>(false);

    createEffect(()=>{
        if(moduleListCntxt){
            let new_rows : ModuleRow[] = [];
            for (let module of moduleListCntxt.state()) {
                new_rows.push({
                    type: module.type,
                    instance: module.instance,
                    hw_version: {
                        url: getModuleEndpoint(module, "/hw_version"),
                        key: "version"
                    },
                    sf_version: {
                        url: getModuleEndpoint(module, "/fw_version"),
                        key: "version"
                    }
                })
            }
            setModuleRows(new_rows);
        }
    })

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
        <div class={styles.container}>
            <div class={styles.versions}>
                <h4>Current versions</h4>
                <div class={styles.system}>
                    <TableStatic
                        data={systemRows()}
                        headers={["service","version"]}
                        colSizes={[undefined,undefined]}
                        renderRow={renderSystemRow}
                        fillHeight={false}
                    ></TableStatic>
                </div>
                <div class={styles.modules}>
                    <TableStatic
                        data={moduleRows()}
                        headers={["module","hardware","software"]}
                        colSizes={[undefined,undefined,undefined]}
                        renderRow={renderModuleRow}
                        fillHeight={false}
                    ></TableStatic>
                </div>
            </div>
            <div class={styles.col_separator}>

            </div>
            <div class={styles.update}>
                <h4>System update</h4>
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
                            <p>drop .swu file here</p>
                            <div class={styles.separator}>
                                <div></div>
                                <p>or</p>
                                <div></div>
                            </div>
                            <p>click to browse local files</p>
                        </Show>
                    </Show>
                </label>
            </div>
        </div>
    )
}

export function SystemUpdate(props : SystemUpdateProps){
    const [rowNum, setRowNum] = createSignal<number>(1);

    return (
        <GridElement id={props.id} w={1} h={max(1 + widgetHeightChange(rowNum()),3)}>
            <Widget name="Version control">
                <SystemUpdateBody
                    {...props}
                    rowLenSetter={setRowNum}
                ></SystemUpdateBody>
            </Widget>
        </GridElement>
    )
}
