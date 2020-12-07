import fs from 'fs'
import path from 'path'

type JSONFile = {
  filename: string
  data: [] | {}
}

type EmptyFile = {
  filename: string
  contentText: string
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

  static createLogFile(file: EmptyFile) {
    const { filename, contentText } = file
    const ext = 'log' 

    console.log(`> Save directory file: src/__generated__/${filename}.${ext}`)

    fs.writeFile(path.join(__dirname, '../', '__generated__', `${filename}.${ext}`), contentText, err => {
      if (err) throw new Error('something went wrong.')
      
      console.log(`> File ${filename}.${ext} was created successfully!`)
    })
  }
}