import { expect } from 'chai'
import { it } from 'mocha'
import {
  canMatch,
  findAllValuesInJson,
  isValidUrl,
  matchURLExceptHash,
} from './utils'

it('canMatch', () => {
  expect(canMatch('example.org', ['*'])).to.be.true
  expect(canMatch('example.org', ['example.org'])).to.be.true
  expect(canMatch('foo.example.org', ['example.org'])).to.be.false
  expect(canMatch('bar.example.org', ['*.example.org'])).to.be.true
  expect(canMatch('example.org', ['example.com'])).to.be.false
})

it('isValidUrl', () => {
  expect(isValidUrl('https://eg.com')).to.be.true
  expect(isValidUrl('http://eg.com')).to.be.true
  expect(isValidUrl('ftp://eg.com')).to.be.false
  expect(isValidUrl('files://eg.com')).to.be.false
})

it('matchURLExceptHash', () => {
  const base = new URL('https://kotori.example.com/posts.php?id=4')
  expect(matchURLExceptHash('https://kotori.example.com/posts.php', base)).to.be
    .false
  expect(matchURLExceptHash('https://kotori.example.com/posts.php?id=5', base))
    .to.be.false
  expect(matchURLExceptHash('https://kotori.example.com/posts.php?id=4', base))
    .to.be.true
  expect(
    matchURLExceptHash(
      'https://kotori.example.com/posts.php?id=4#minami',
      base,
    ),
  ).to.be.true
})

it('findAllValuesInJson', () => {
  const url = 'https://kotori.example.com/posts.php?id=4'
  const base = new URL(url)
  expect(findAllValuesInJson([], base)).to.be.false
  expect(
    findAllValuesInJson(['https://kotori.example.com/posts.php?id=4'], base),
  ).to.be.false
  expect(
    findAllValuesInJson(
      {
        [url]: 'test',
      },
      base,
    ),
  ).to.be.false
  expect(
    findAllValuesInJson(
      {
        page0: 't',
        page1: url,
        page2: 't',
      },
      base,
    ),
  ).to.be.true
  expect(
    findAllValuesInJson(
      {
        page0: {
          page1: {
            page2: {
              page3: 't',
              page4: [url],
            },
          },
        },
      },
      base,
    ),
  ).to.be.true
})
