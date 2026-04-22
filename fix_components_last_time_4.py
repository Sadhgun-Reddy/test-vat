import re
import os

os.system("mv src/components/settings/DesignationPermissionMatrix.jsx src/components/settings/DesignationPermissionMatrix.tsx")
os.system("mv src/constants/designationPermissionMatrix.js src/constants/designationPermissionMatrix.ts")

with open("src/services/types/dashboard.types.ts", "r") as f:
    content = f.read()
content = content.replace("[key: string]: any; // Added for any Leaflet mapping compatibility", "[key: string]: string | number;")
with open("src/services/types/dashboard.types.ts", "w") as f:
    f.write(content)

with open("src/constants/designationPermissionMatrix.ts", "r") as f:
    content = f.read()
content = content.replace("export const DESIGNATION_PERMISSION_MATRIX = [", """export type PermissionRow = {
  id: string;
  label: string;
  modes: string[];
  import?: boolean;
};

export type PermissionSection = {
  section: string;
  rows: PermissionRow[];
};

export const DESIGNATION_PERMISSION_MATRIX: PermissionSection[] = [""")
with open("src/constants/designationPermissionMatrix.ts", "w") as f:
    f.write(content)

with open("src/components/settings/DesignationPermissionMatrix.tsx", "r") as f:
    content = f.read()
content = re.sub(r"function FlagCell\({ value, rowId, flag, onToggle, enabled }\) {", r"""type PermissionsMap = {
  [rowId: string]: {
    [flag: string]: boolean;
  };
};

type FlagCellProps = {
  value: PermissionsMap;
  rowId: string;
  flag: string;
  onToggle: (rowId: string, flag: string) => void;
  enabled: boolean;
};

function FlagCell({ value, rowId, flag, onToggle, enabled }: FlagCellProps): JSX.Element {""", content)
content = re.sub(r"export function DesignationPermissionMatrix\({ value, onChange }\) {\n  const v = value && typeof value === 'object' \? value : {};\n\n  const onToggle = \(rowId, flag\) => {", r"""export type DesignationPermissionMatrixProps = {
  value: unknown;
  onChange: (value: PermissionsMap) => void;
};

export function DesignationPermissionMatrix({ value, onChange }: DesignationPermissionMatrixProps): JSX.Element {
  const v = (value && typeof value === 'object' ? value : {}) as PermissionsMap;

  const onToggle = (rowId: string, flag: string) => {""", content)
with open("src/components/settings/DesignationPermissionMatrix.tsx", "w") as f:
    f.write(content)
