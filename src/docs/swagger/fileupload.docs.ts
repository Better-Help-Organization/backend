import { SwaggerDoc } from "src/common/decorators/swagger-docs.decorator";

export const ApiUploadImage = SwaggerDoc({
    operationSummary:`Upload an image to the specified folder of which are '/profile', ... `,
    responses:[
        {
        status: 201,
        description: 'File successfully uploaded',
        examples:{
            example:{
            value:{
                "data": {
                "fieldname": "file",
                "originalname": "person.jpg",
                "encoding": "7bit",
                "mimetype": "image/jpeg",
                "filename": "1733648248286-person.jpg",
                "path": "vehicle-type",
                "size": 152922
                    }
                }}
            }
        },
        { 
            status: 400, 
            description: 'Invalid file type' 
        }
    ],
        bodyConfig:{ 
            description:"The file to upload", 
            type:"multipart/form-data" },
        paramConfig:[{ 
            name: 'folder', 
            description: 'The folder where the file will be uploaded' 
        },
    ],
    consumesConfig:"multipart/form-data"
})

export const ApiDeleteImage = SwaggerDoc({
    operationSummary:`Delete an image from the specified folder of which are '/profile', ...
        `,
    responses:[
        { status: 200, description: 'File successfully deleted' },
        { status: 404, description: 'File not found' } 
    ],
    paramConfig: [
            { name: 'folder', description: 'The folder from which the file will be deleted' },
            { name: 'filename', description: 'The filename of the image to delete' }
        ]
})