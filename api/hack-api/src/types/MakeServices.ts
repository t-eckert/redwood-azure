import { MakeServicesInterface } from "../interfaces"

import Services from "./Services"

type MakeServices = (args: MakeServicesInterface) => Services

export default MakeServices
