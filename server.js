const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();

const upload = multer({ dest: 'uploads/' });

app.set('view engine', 'ejs');
app.use(express.json());


app.get('/', (req, res) => {
    res.render('home', { message: null, downloadLink: null, code: null });
});
app.get('/upload', (req, res) => {
    res.render('home', { message: null, downloadLink: null, code: null });
});

app.post('/upload', upload.single('file'), (req, res) => {
    const filePath = req.file.path;
    const outputFilePath = path.join(__dirname, 'uploads', `${req.file.filename}_output.json`);

    fs.readFile(filePath, 'utf8', (err, rowData) => {
        if (err) {
            return res.status(500).send('Error reading file');
        }

        const jsonResult = convertRowToJson(rowData);

        fs.writeFile(outputFilePath, JSON.stringify(jsonResult, null, 2), 'utf8', (err) => {
            if (err) {
                return res.status(500).send('Error writing JSON file');
            }

            res.render('home', {
                message: 'File converted successfully!',
                downloadLink: `/download/${path.basename(outputFilePath)}`,
                rowData: rowData,
                code: jsonResult
            });

            fs.unlinkSync(filePath);
        });
    });
});

app.post('/convert', (req, res) => {
    const { rowData } = req.body;

    if (!rowData) {
        return res.status(400).send('No data provided');
    }

    const jsonResult = convertRowToJson(rowData);

    const outputFilePath = path.join(__dirname, 'uploads', `converted_${Date.now()}.json`);

    fs.writeFile(outputFilePath, JSON.stringify(jsonResult, null, 2), 'utf8', (err) => {
        if (err) {
            return res.status(500).send('Error writing JSON file');
        }

        res.json({
            message: 'Data converted successfully!',
            downloadLink: `/download/${path.basename(outputFilePath)}`,
            rowData: rowData, 
            code: jsonResult  
        });
    });
});





app.get('/download/:file', (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.params.file);
    res.download(filePath, (err) => {
        if (err) {
            res.status(500).send('Error downloading file');
        }
        fs.unlinkSync(filePath);
    });
});


app.listen(4000, () => {
    console.log('Server is running on port 4000')
});

function convertRowToJson(rowData) {
    const lines = rowData.trim().split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    return lines.slice(1).map(line => {
        const values = line.split(',').map(value => value.trim());
        return headers.reduce((obj, header, index) => {
            obj[header] = values[index];
            return obj;
        }, {});
    });
}
