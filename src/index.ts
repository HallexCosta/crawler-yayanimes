import puppeteer, { Page } from 'puppeteer'

import * as config from '../puppeteer.config'
import { Utils } from "./utils"
 
type Episodie = {
  title: string
  thumbnail: string
}

type Anime = {
  name: string
  image_url: string
  genre: string
  status: string
  studio: string
  sinopse: string
  release_data: number
  rating: number
  episodies: Episodie[]
}

async function gettingAnime(page: Page, animesNames: string[]): Promise<Anime[]> {
  const animes: Anime[] = []

  for (let index = 0; index < animesNames.length; index++) {
    console.log('', '', '', `> ${index+1}) ${animesNames[index]}`)

    await page.goto(`${config.base_url}/${animesNames[index]}`, {
      timeout: 0,
      waitUntil: 'networkidle2'
    })

    const anime: Anime = await page.evaluate(async function () {
      const title = document.querySelector('span.color-change') as HTMLSpanElement
      const image = document.querySelector('#capaAnime > img') as HTMLImageElement
      const about = document.querySelectorAll<HTMLTableRowElement>('table > tbody > tr')
      const sinopse = document.querySelectorAll('.single div')
      const rating = document.querySelector('#rmp-rating')
      const episodies = [...document.querySelectorAll('.contentBox ul li > div.box-episodio3')]

      const animesDetail = {
        name: title.innerHTML.trim(),
        image_url: image.src.trim(),
        studio: about[0].children[1].innerHTML.trim(),
        genre: about[1].children[1].innerHTML.trim(),
        status: about[2].children[1].innerHTML.trim(),
        release_data: Number(about[3].children[1].innerHTML.trim()),
        rating: Number(rating?.innerHTML.trim() as string),
        sinopse: sinopse[13].innerHTML.trim(),
        episodies: episodies.map<Episodie>(episodie => ({
          title: episodie.children[0].children[0].innerHTML.trim(),
          thumbnail: episodie.children[0].children[1].children[0].attributes[0].nodeValue as string
        }))
      }

      console.log(`${animesDetail.name} - Detail`, animesDetail)

      return animesDetail
    })

    animes.push(anime)
  }

  return animes
}

function normalize(animesNames: string[]) {
  return animesNames.map(animeName => animeName.trim().toLowerCase())
}

async function gettingAnimesRouteParam(page: Page): Promise<string[]> {
  await page.goto(`${config.base_url}/lista-de-animes`, {
    timeout: 0,
    waitUntil: 'networkidle2'
  })

  return await page.evaluate(function() {
    const animesNamesAnchor: HTMLAnchorElement[] = [
      ...document
        .querySelectorAll<HTMLAnchorElement>('.aba ul > li > a')
    ]

    const animesURL = animesNamesAnchor.map(animeName => animeName.href)
    const animesParams = animesURL.map(animeURL => animeURL.split('/')[3])

    return animesParams
  })
}

(async function () {
  try {
    const browser = await puppeteer.launch(config.launch)

    const page = await browser.newPage()

    //Getting Animes Routes
    console.log()
    console.log('> Getting Animes Routes')
    const animesRouteParam = await gettingAnimesRouteParam(page)

    // Getting Animes Data
    console.log('> Getting Animes Data')
    const animes: Anime[] = await gettingAnime(page, normalize(['charlotte', 'darling-in-the-franxx']))
    console.log()
    console.log('Animes', animes)
    console.log()

    Utils.createJSONFile({
      filename: 'database',
      data: animes
    })

    console.log()
    console.log('> Finish Crawler Script!')

    // await page.close()
    // await browser.close()
  } catch(e) {
    console.log(e)
  } 
})()

console.log('> Running App')