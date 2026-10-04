// Cuentas iniciales de CIMIENTO. Solo contienen salt + hash PBKDF2 (nunca
// la contraseña en texto plano). OJO: al no existir un backend, este archivo
// viaja dentro de la aplicación; es control de acceso de interfaz, no
// seguridad fuerte. La autenticación real llegará con el backend (Supabase).
import type { UserRecord } from "./types";

export const SEED_USERS: UserRecord[] = [
  {
    "id": "admin",
    "aliases": [],
    "displayName": "Administrador",
    "role": "ADMINISTRADOR",
    "salt": "vAzOY+0W+iyH23e7PKJWXA==",
    "hash": "AcJYZX8jNB8s2suHULF/EskpiQGQ3WrYPIZFSeeiVuY="
  },
  {
    "id": "usuarios",
    "aliases": [],
    "displayName": "Pastor",
    "role": "PASTOR",
    "salt": "IvR8r/8awoJPbIbhUExBwA==",
    "hash": "x/Lb7Nt3wkki+nF3scSPAeUKMfKXgvdGqDeHE2ZqBXE="
  },
  {
    "id": "lela",
    "aliases": [
      "lela1234"
    ],
    "displayName": "Lela",
    "role": "MAESTRO",
    "salt": "2V0aHqsmAACZ2MtZReuCZQ==",
    "hash": "H92bOCsPJ/ZNeBkoUPHlpzVn3itfHTbmACJd+05ha3Y="
  },
  {
    "id": "tefa",
    "aliases": [
      "tefa1234"
    ],
    "displayName": "Tefa",
    "role": "MAESTRO",
    "salt": "a5sECPZ9URO+5wjwkx0P4w==",
    "hash": "lXci5y2lQhdR9DvvQmGgHkdPD4GwhgL5TiqZJQOkn6c="
  },
  {
    "id": "yely",
    "aliases": [
      "yely1234"
    ],
    "displayName": "Yely",
    "role": "MAESTRO",
    "salt": "IPZGBzAsq9UpITSqMqi/gw==",
    "hash": "rERixpZghYCIo/IuEu2kZPMY8DUiR1y6gAd2XAyMzBU="
  },
  {
    "id": "mari",
    "aliases": [
      "mari1234"
    ],
    "displayName": "Mari",
    "role": "MAESTRO",
    "salt": "jqnurslvLr6xpyCsn03B3A==",
    "hash": "ZhgcsgeodAd2IKng/0LRO+Co8tIf+x8xu9A13JZt9uE="
  },
  {
    "id": "yeni",
    "aliases": [
      "yeni1234"
    ],
    "displayName": "Yeni",
    "role": "MAESTRO",
    "salt": "qrWjYcLJGEFsDEySVwVpYg==",
    "hash": "k1bGHIq6z+7iW+A+TuMv4bb7jHbgr4bouxF6NWV9CY0="
  },
  {
    "id": "naty",
    "aliases": [
      "naty1234"
    ],
    "displayName": "Naty",
    "role": "MAESTRO",
    "salt": "3tuIv6MtWD2yVQlff6i4rg==",
    "hash": "W3jNkpJf8obFN84NhvgmURaxa1mKN3/iAy9XcRbZRZ8="
  },
  {
    "id": "nuna",
    "aliases": [
      "nuna1234"
    ],
    "displayName": "Nuna",
    "role": "MAESTRO",
    "salt": "EsNT/SFBANlP1iE++0hV+A==",
    "hash": "TZyW7c0Sq/ncwBeX/Wv1kLB71i/wb7U2WsyNqEbqQWE="
  },
  {
    "id": "estudiante",
    "aliases": [],
    "displayName": "Estudiante",
    "role": "ESTUDIANTE",
    "salt": "usQFn+B+cER3WmXvJndEKA==",
    "hash": "V/Xazl4BXGLReJw5Ogf9eMBGnmN1zOhoX1uUNxdfvSs="
  }
];
