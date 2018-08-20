const webdriver = require('selenium-webdriver');
let assert = require('assert');
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

});
//Testing that profanity is being filtered

//Testing that non-letters are not allowed