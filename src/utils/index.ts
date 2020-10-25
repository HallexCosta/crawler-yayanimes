import fs from 'fs'
import path from 'path'

type JSONFile = {
  filename: string
  data: [] | {}
}

export class Utils {
  static createJSONFile(json: JSONFile) {
    const { filename, data } = json
    const ext = 'json' 

    console.log(`> Save directory file: src/__generated__/${filename}.${ext}`)

    fs.writeFile(path.join(__dirname, '../', '__generated__', `${filename}.${ext}`), JSON.stringify(data, null, 2), err => {
      if (err) throw new Error('something went wrong.')
      
      console.log(`> File ${filename}.${ext} was created successfully!`)
    })
  }
}