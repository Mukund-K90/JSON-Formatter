const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const app = express();

const upload = multer({ dest: 'uploads/' });

app.set('view engine', 'ejs');
app.use(express.json());


app.get('/', (req, res) => {
    res.render('home', {
        message: null, downloadLink: null, rowData: null,
        code: null,
        operation: null
    });
});
app.get('/convert', (req, res) => {
    res.render('home', {
        message: null, downloadLink: null, rowData: null,
        code: null,
        operation: null
    });
});

app.post('/convert', upload.single('file'), (req, res) => {
    const { rowData, operation } = req.body;
    console.log(rowData);

    if (!operation || !['CsvToJson', 'JsonToCsv'].includes(operation)) {
        return res.status(400).send('Invalid operation');
    }

    if (req.file) {
        const filePath = req.file.path;

        if (operation === 'CsvToJson') {
            if (req.file.mimetype === "application/json") {
                return res.render('home', {
                    message: 'Data is already in JSON format',
                    downloadLink: null,
                    rowData: null,
                    code: null,
                    operation: null
                });
            }

            const outputFilePath = path.join(__dirname, 'uploads', `${Date.now()}-${operation}.json`);

            fs.readFile(filePath, 'utf8', (err, fileData) => {
                if (err) {
                    return res.status(500).send('Error reading file');
                }

                const jsonResult = convertRowToJson(fileData);

                fs.writeFile(outputFilePath, JSON.stringify(jsonResult, null, 2), 'utf8', (err) => {
                    if (err) {
                        return res.status(500).send('Error writing JSON file');
                    }

                    res.render('home', {
                        message: 'File converted successfully!',
                        downloadLink: `/download/${path.basename(outputFilePath)}`,
                        rowData: fileData,
                        code: jsonResult,
                        operation: operation
                    });

                    fs.unlinkSync(filePath);
                });
            });
        } else if (operation === 'JsonToCsv') {
            console.log("JsonToCsv");

            if (req.file.mimetype === "text/csv") {
                return res.render('home', {
                    message: 'Data is already in CSV format',
                    downloadLink: null,
                    rowData: null,
                    code: null,
                    operation: null
                });
            }

            const outputFilePath = path.join(__dirname, 'uploads', `${Date.now()}-${operation}.csv`);

            fs.readFile(filePath, 'utf8', (err, fileData) => {
                if (err) {
                    return res.status(500).send('Error reading file');
                }

                const jsonResult = JSON.parse(fileData);

                const rowResult = convertJsonToRow(jsonResult);

                fs.writeFile(outputFilePath, rowResult, 'utf8', (err) => {
                    if (err) {
                        return res.status(500).send('Error writing CSV file');
                    }

                    res.render('home', {
                        message: 'File converted successfully!',
                        downloadLink: `/download/${path.basename(outputFilePath)}`,
                        rowData: fileData,
                        code: rowResult,
                        operation: operation
                    });

                    fs.unlinkSync(filePath);
                });
            });
        }
    } else if (rowData) {
        if (operation === 'CsvToJson') {
            const jsonResult = convertRowToJson(rowData);

            const outputFilePath = path.join(__dirname, 'uploads', `${Date.now()}-${operation}.json`);

            fs.writeFile(outputFilePath, JSON.stringify(jsonResult, null, 2), 'utf8', (err) => {
                if (err) {
                    return res.status(500).send('Error writing JSON file');
                }

                res.json({
                    message: 'Data converted successfully!',
                    downloadLink: `/download/${path.basename(outputFilePath)}`,
                    rowData: rowData,
                    code: jsonResult,
                    operation: operation
                });
            });
        } else if (operation === 'JsonToCsv') {
            const jsonResult = JSON.parse(rowData);
            const rowResult = convertJsonToRow(jsonResult);

            const outputFilePath = path.join(__dirname, 'uploads', `${Date.now()}-${operation}.csv`);

            fs.writeFile(outputFilePath, rowResult, 'utf8', (err) => {
                if (err) {
                    return res.status(500).send('Error writing CSV file');
                }

                res.json({
                    message: 'Data converted successfully!',
                    downloadLink: `/download/${path.basename(outputFilePath)}`,
                    rowData: rowData,
                    code: rowResult,
                    operation: operation
                });
            });
        }
    } else {
        res.status(400).send('No data provided');
    }
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

function convertJsonToRow(jsonData) {
    if (!Array.isArray(jsonData) || jsonData.length === 0) {
        throw new Error('Input must be a non-empty array of objects.');
    }

    const headers = Object.keys(jsonData[0]);
    const csv = [
        headers.join(','),
        ...jsonData.map(obj =>
            headers.map(header => obj[header] || "").join(',')
        )
    ].join('\n');

    return csv;
}
