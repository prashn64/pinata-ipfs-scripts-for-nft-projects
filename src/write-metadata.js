/*
MIT License

Copyright (c) 2022 Prayrit (Prash) Jain

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

*/

const { getFileName } = require("./utils.js");
const fs = require("fs-extra");
const recursive = require("recursive-fs");
const crypto = require("crypto");

const path = require('path');

(async () => {
    
    async function isExists(path) {
      try {
        await fs.access(path);
        return true;
      } catch {
        return false;
      }
    };
    
    async function writeFile(filePath, data) {
      try {
        const dirname = path.dirname(filePath);
        const exist = await isExists(dirname);
        if (!exist) {
          await fs.mkdir(dirname, {recursive: true});
        }
        
        await fs.writeFile(filePath, data, 'utf8');
      } catch (err) {
        throw new Error(err);
      }
    }


  /**
   * Upload a file's data to Pinata and provide a metadata name for the file.
   * This fileName can be either the name of the file being uploaded, or any
   * name sufficent enough to identify the contents.
   *
   * @param {string} fileName the file name to use for the uploaded data
   * @param {string} filePath the path to the file to upload and pin to Pinata
   * @return {string} returns the IPFS hash (CID) for the uploaded file
   */
  const imageExtension = "png";
  const keyword = "Zero";
  const keywordHash =  crypto
            .createHash("sha256")
            .update(keyword)
            .digest("hex");

  const maxValue = parseInt("ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", 16);
  const minValue = 0;

  function normalize(num) {
    return Math.floor(((num - minValue) / (maxValue - minValue) + .5) * 100);
  }

  const graceTraitName = "Dan's Grace";
  function writeGrace(metadataJson, graceValue) {
    var attrs = metadataJson.attributes.map((val) => {
        if (val.trait_type === graceTraitName) {
            console.log(`setting grace value ${graceValue} old was ${val.value}`);
            val.value = graceValue;
        }
        return val;
    });

    metadataJson.attributes = attrs;
    return metadataJson;
  }

  const writeMetadataFile = async (fileName, filePath, outputPath, pinataCIDs, imageHashes) => {
    imageName = fileName.replace("json", imageExtension);
    const ipfsHash = pinataCIDs[imageName];
    const imageHash = imageHashes[imageName];

    console.log(`keywordHash ${keywordHash} imageHash ${imageHash}`);
    console.log(normalize(parseInt(keywordHash, 16) - parseInt(imageHash, 16)));
    
    console.log(`uploading ${fileName} at ${filePath} w/ ${ipfsHash}`);

    let metadataJson = fs.readJsonSync(filePath);
    metadataJson.image = `ipfs://${ipfsHash}`;
    metadataJson = writeGrace(metadataJson, normalize(parseInt(keywordHash, 16) - parseInt(imageHash, 16)));
    let completeMetadata = JSON.stringify(metadataJson);
    writeFile(`${outputPath}/${fileName}`, completeMetadata);

    console.log("write complete for " + fileName);
  };

  try {
    let folderPath = "files";
    var args = process.argv.slice(2);
    if (args.length > 1) {
      folderPath = args[0];
      imageFolderPath = args[1];
    } else {
        console.log("please provide both a metadata path and image path");
        return;
    }
    const outputPath = `./output/${folderPath}`;
    const pinataCIDs = fs.readJsonSync(`./output/${imageFolderPath}/uploaded-cids.json`) ?? {};
    const imageHashes = fs.readJsonSync(`./output/${imageFolderPath}/file-hashes.json`) ?? {};

    const { files } = await recursive.read(folderPath);
    if (files?.length <= 0) {
      console.info("No files were found in folder path.");
      return;
    }
    await Promise.all(
      files.map(async (filePath) => {
        const fileName = getFileName(filePath);
        writeMetadataFile(fileName, filePath, outputPath, pinataCIDs, imageHashes);
      })
    );
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
