import fs from 'fs'
import path from 'path'

export type EmptyFile = {
  filename: string
  extension: string
  directorySave: string
  dataContent: string | [] | {}
  isJSON: boolean
}

export function saveFile(data: EmptyFile) {
  const {
    filename,
    extension,
    directorySave,
    dataContent,
    isJSON,
  } = data

  const dataText = isJSON ? JSON.stringify(dataContent, null, 2) : dataContent as string

  fs.writeFile(path.join(__dirname, directorySave, `${filename}.${extension}`), dataText, err => {
    if (err) throw new Error('something went wrong.')
  })

  return true
}