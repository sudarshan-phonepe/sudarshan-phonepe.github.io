function createPhonepePaymentRequest(data){
    if (!window.PaymentRequest) return null;

    var paymentRequestPhonepe = new PaymentRequest([{
        supportedMethods: ["https://mercury-stg.phonepe.com/transact/checkout"],
        data: data
    }], {total: {label: 'Cart Amount', amount: {currency: 'INR', value: '100'}}});
    return paymentRequestPhonepe;
}

function shouldWarmUp(phonepeCheckoutData) {
    var MS_PER_MINUTE = 60000;
    var minUpdatedTime = Date.now() - 10 * MS_PER_MINUTE;
    if(phonepeCheckoutData.getItem('updatedTime') == null )
        return true;
    if(phonepeCheckoutData.getItem('updatedTime') <  minUpdatedTime)
        return true;
    if(phonepeData.getItem('eligibilityForExpressbuy') == 'false')
        return true;
    return false;
}

async function getExpressbuyResults(paymentRequestContext){
    if(sessionStorage.getItem('phonepeCheckoutData') == null || shouldWarmUp(sessionStorage.getItem('phonepeCheckoutData')))
        await warmupAndSaveResults(paymentRequestContext);
    var phonepeCheckoutData = sessionStorage.getItem('phonepeCheckoutData');

    return {
        'userOperatingSystem': phonepeCheckoutData.getItem('userOperatingSystem'),
        'network': phonepeCheckoutData.getItem('network'),
        'eligibility': phonepeCheckoutData.getItem('eligibilityForExpressbuy'),
        'canMakePayment': phonepeCheckoutData.getItem('canMakePayment'),
        'hasEnrolledInstrument': phonepeCheckoutData.getItem('hasEnrolledInstrument'),
        'retries': phonepeCheckoutData.getItem('hasEnrolledInstrumentRetries'),
        'elapsedTime': phonepeCheckoutData.getItem('elapsedTime'),
        'paymentRequestSupported': phonepeCheckoutData.getItem('paymentRequestSupported')
    };
}

async function warmupAndSaveResults(paymentRequestContext) {
    console.log(navigator.userAgent);
    var userOperatingSystem = navigator.userAgent.split(';')[1].trim();
    var network = navigator.connection.effectiveType;
    var isAndroid = false;
    var paymentRequestSupported = false;
    var canMakePayment = false;
    var hasEnrolledInstrument = false;
    var retries = sessionStorage.getItem('hasEnrolledInstrumentRetries') ?? 0;
    if(userOperatingSystem.includes("Android"))
        isAndroid = true;
    console.log(userOperatingSystem);
    console.log(isAndroid);

    var data = {
        url: "ppe://expressbuy",
        constraints : paymentRequestContext?.constraints ?? []
    }
    var paymentRequestPhonepe = createPhonepePaymentRequest(data);
    if(isAndroid && paymentRequestPhonepe != null)
    {
        paymentRequestSupported = true;
        canMakePayment = await paymentRequestPhonepe.canMakePayment();
        startTime = performance.now();
        var pageRetryLimit = 3;
        while(canMakePayment == true && retries < 9 && hasEnrolledInstrument == false && pageRetryLimit > 0)
        {
            hasEnrolledInstrument = await paymentRequestPhonepe.hasEnrolledInstrument()
            if(hasEnrolledInstrument) break;
            paymentRequestPhonepe = createPhonepePaymentRequest(data);
            retries++;
            pageRetryLimit--;
        }
        endTime = performance.now();
        var elapsedTime = endTime - startTime;
    }
    
     var phonepeCheckoutData = {
        'hasEnrolledInstrumentRetries', retries,
        'eligibilityForExpressbuy', hasEnrolledInstrument,
        'userOperatingSystem', userOperatingSystem,
        'paymentRequestSupported', paymentRequestSupported,
        'hasEnrolledInstrument', hasEnrolledInstrument,
        'elapsedTime', elapsedTime,
        'canMakePayment', canMakePayment,
        'network': network,
        'updatedTime' : Date.now()
    }

    sessionStorage.setItem('phonepeCheckoutData', phonepeCheckoutData);
}
