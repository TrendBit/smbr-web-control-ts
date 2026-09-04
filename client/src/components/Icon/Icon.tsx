import { Public } from "../../assets/PublicFiles";
import { createIconComponent } from "../../../lib/web-components/Icon/Icon";
import { iconNameToCharacter, type Icons } from "./icons_chars";



export const Icon = createIconComponent<Icons, typeof iconNameToCharacter>(iconNameToCharacter);
