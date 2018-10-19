/*
  Copyright 2017-2018 James V. Craster
  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at
      http://www.apache.org/licenses/LICENSE-2.0
  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/
let assert = require('assert');
//UI testing is not currently supported by travis-ci (need to set up sauce labs account)
/*const webdriver = require('selenium-webdriver');
const {
    By
} = require('selenium-webdriver');
let test = require('selenium-webdriver/testing');

let driver = new webdriver.Builder().forBrowser('chrome').build();
driver.manage().timeouts().implicitlyWait(2000);
test.describe('Homepage static links', function () {
    test.before(function () {
        this.timeout(5000);
        driver.get('localhost:8081');
    })
    test.it('Shows 404', function () {
        this.timeout(5000);
        driver.get('localhost:8081/randomstuff').then(() => {
            driver.findElement(By.id('404test')).then(() => {

            })
        })
    })
});
test.describe('Register', function () {
    test.before(function () {
        this.timeout(4000);
        driver.get('localhost:8081')
        driver.findElement(By.className('newAccountButton')).click();
    })
    test.it('Shows register modal', function () {
        driver.findElement(By.id('registerModal')).then(function (element) {
            assert(element.isDisplayed);
        })
    })
})
test.describe('Log In', function () {

    test.before(function () {
        this.timeout(5000);
        driver.get('localhost:8081');
        driver.findElement(By.className('loginButton')).click();
    })

    test.after(function () {
        driver.quit();
    });

    test.it('Shows login modal', function () {
        driver.findElement(By.id('loginModal')).then(function (element) {
            assert(element.isDisplayed(), true);
        })
        driver.sleep();
    });
    test.it('Allows example user to log in', function () {
        this.timeout(5000);
        console.log('before testing make sure to register a user with username "example" and password "password"')
        driver.findElement(By.id('loginUsername')).sendKeys('example').then(() => {
            driver.findElement(By.id('loginPassword')).sendKeys('password').then(() => {
                driver.findElement(By.id('loginSubmit')).submit().then(() => {
                    driver.findElement(By.id('loggedInWelcome')).then((element) => {
                        assert(element.isDisplayed(), true);
                    });
                });
            });
        })
    })
    test.it('Allows example user to log out', function () {
        driver.findElement(By.className('logoutButton')).click().then(() => {
            driver.findElement(By.className('loginButton')).then(() => {
                assert(true, true);
            })
        })
    })
    test.it('Does not allow unauthorised user to log in', function () {
        this.timeout(5000);
        driver.findElement(By.className('loginButton')).click().then(() => {
            driver.findElement(By.id('loginUsername')).sendKeys('example').then(() => {
                driver.findElement(By.id('loginPassword')).sendKeys('blahblah').then(() => {
                    driver.findElement(By.id('loginSubmit')).submit().then(() => {
                        driver.findElements(By.className('loggedInWelcome')).then((list) => {
                            assert.equal(list.length, 0);
                        });
                    });
                });
            })
        });
    })

});*/
//Testing that profanity is being filtered

//Testing that non-letters are not allowed

//Unit testing