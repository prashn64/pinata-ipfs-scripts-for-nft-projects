/*
MIT License

Copyright (c) 2021 Rob (Coderrob) Lindley

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
const Bottleneck = require("bottleneck");
const crypto = require("crypto");
const recursive = require("recursive-fs");

(async () => {
  const rateLimiter = new Bottleneck({
    maxConcurrent: 5, // arbitrary value - don't overdue file access
  });

  try {
    let folderPath = "files";
    var args = process.argv.slice(2);
    if (args.length > 0) {
      folderPath = args[0];
    }
    const outputPath = `./output/${folderPath}/file-hashes.json`;
    const hashMapping = {};
    const { files } = await recursive.read(folderPath);
    if (files?.length <= 0) {
      console.info("No files were found in folder path.");
      return;
    }
    await Promise.all(
      files.map((filePath) =>
        rateLimiter.schedule(() => {
          const fileName = getFileName(filePath);
          const fileData = fs.readFileSync(filePath);
          hashMapping[fileName] = crypto
            .createHash("sha256")
            .update(fileData)
            .digest("hex");
        })
      )
    );
    fs.outputJsonSync(outputPath, hashMapping);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
