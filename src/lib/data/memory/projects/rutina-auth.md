![Node.js](https://img.shields.io/badge/Node.js-16.13.0-green)
![Axios](https://img.shields.io/badge/Axios-^1.7.7-blue)
![Chalk](https://img.shields.io/badge/Chalk-^5.3.0-brightgreen)
![cli-table3](https://img.shields.io/badge/cli--table3-^0.6.5-orange)
![dotenv](https://img.shields.io/badge/dotenv-^16.4.5-yellow)
![Inquirer](https://img.shields.io/badge/Inquirer-^9.1.4-purple)

--- 
## Instalación
1. Clona el repositorio:
```sh
  git clone 
```
2. Navega al directorio del projecto:
```sh
  cd auth_test
```
3. Instala las dependencias
```sh
  npm install
```
4. Crear un archivo `.env` en el directorio raíz del projecto con las siguientes variables
```sh
API_URL=
TIMEOUT=5000
```
5. Para comenzar la rutina, ejecute el siguiente comando:
```sh
npm run check
```
--- 

### Estructura de Datos
Los archivos `JSON` que se listan en la opción para verificar permisos y legajos, se encuentran dentro de `src/data`. Los mismos deben estar en formato `JSON` y cumplir con el formato: 

```json
[
    {
        "legajo" : "7683",
        "password": "123456"
    },
    {
        "legajo": "1234",
        "password": "123456"
    }
] 
```

--- 
---

## Notas adicionales
- Asegurarse de que el archivo .env esté correctamente configurado en el directorio raíz del proyecto.
- Verifica que el directorio `src/data` contenga el archivo `JSON` con los usuarios a verificar.