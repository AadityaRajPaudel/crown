import React from "react";
import "./App.css";

export default function App() {
  const [formData, setFormData] = React.useState({
    pickupLocation: "",
    pickupCoords: null,
    deliveryLocation: "",
    deliveryCoords: null,
    length: 10,
    width: 10,
    height: 10,
    packageType: "standard",
    isInsuranceRequired: false,
  });

  const [pickupSuggestions, setPickupSuggestions] = React.useState([]);
  const [deliverySuggestions, setDeliverySuggestions] = React.useState([]);
  const [showPickupSuggestions, setShowPickupSuggestions] =
    React.useState(false);
  const [showDeliverySuggestions, setShowDeliverySuggestions] =
    React.useState(false);
  const [error, setError] = React.useState("");
  const [result, setResult] = React.useState(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const fetchPickupSuggestions = async () => {
      if (formData.pickupLocation.length > 2 && !formData.pickupCoords) {
        const suggestions = await getSuggestions(formData.pickupLocation);
        setPickupSuggestions(suggestions || []);
      } else {
        setPickupSuggestions([]);
        setShowPickupSuggestions(false);
      }
    };

    fetchPickupSuggestions();
  }, [formData.pickupLocation, formData.pickupCoords]);

  React.useEffect(() => {
    const fetchDeliverySuggestions = async () => {
      if (formData.deliveryLocation.length > 2 && !formData.deliveryCoords) {
        const suggestions = await getSuggestions(formData.deliveryLocation);
        setDeliverySuggestions(suggestions || []);
      } else {
        setDeliverySuggestions([]);
        setShowDeliverySuggestions(false);
      }
    };

    fetchDeliverySuggestions();
  }, [formData.deliveryLocation, formData.deliveryCoords]);

  const getSuggestions = async (locationText) => {
    try {
      const API_KEY = import.meta.env.VITE_GEOAPIFY_SECRET_KEY;
      const result = await fetch(
        `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
          locationText
        )}&limit=5&apiKey=${API_KEY}`
      );
      const res = await result.json();
      return res.features;
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      return [];
    }
  };

  const handlePickupSelect = (suggestion) => {
    setFormData((prev) => ({
      ...prev,
      pickupLocation: suggestion.properties.formatted,
      pickupCoords: {
        lat: suggestion.properties.lat,
        lon: suggestion.properties.lon,
      },
    }));
    setShowPickupSuggestions(false);
  };

  const handleDeliverySelect = (suggestion) => {
    setFormData((prev) => ({
      ...prev,
      deliveryLocation: suggestion.properties.formatted,
      deliveryCoords: {
        lat: suggestion.properties.lat,
        lon: suggestion.properties.lon,
      },
    }));
    setShowDeliverySuggestions(false);
  };

  const getDistance = async () => {
    if (!formData.pickupCoords || !formData.deliveryCoords) {
      throw new Error("Please select valid pickup and delivery locations");
    }

    try {
      const API_KEY = import.meta.env.VITE_GEOAPIFY_SECRET_KEY;
      const { lat: lat1, lon: lon1 } = formData.pickupCoords;
      const { lat: lat2, lon: lon2 } = formData.deliveryCoords;

      const response = await fetch(
        `https://api.geoapify.com/v1/routing?waypoints=${lat1},${lon1}|${lat2},${lon2}&mode=drive&apiKey=${API_KEY}`
      );

      if (!response.ok) {
        throw new Error("Failed to calculate route distance");
      }

      const data = await response.json();
      const distanceInMeters = data.features[0].properties.distance;
      const distanceInKm = distanceInMeters / 1000;

      return distanceInKm;
    } catch (error) {
      throw new Error("Error calculating distance: " + error.message);
    }
  };

  const calculatePrice = (distance) => {
    const BASE_RATE = 80;
    const RATE_PER_KM = 2;
    const SERVICE_CHARGE = 50;
    const FUEL_SURCHARGE = distance * 0.5;

    const volume =
      (formData.length * formData.width * formData.height) / 1000000;

    const packageMultipliers = {
      standard: 1,
      fragile: 1.5,
      document: 0.8,
    };

    const volumeCharge = volume > 0.01 ? volume * 100 : 0;

    let totalPrice =
      BASE_RATE +
      distance * RATE_PER_KM +
      SERVICE_CHARGE +
      FUEL_SURCHARGE +
      volumeCharge;

    totalPrice *= packageMultipliers[formData.packageType];

    const insuranceCost = formData.isInsuranceRequired ? totalPrice * 0.1 : 0;
    totalPrice += insuranceCost;

    return {
      baseRate: BASE_RATE,
      distanceCost: distance * RATE_PER_KM,
      serviceCharge: SERVICE_CHARGE,
      fuelSurcharge: FUEL_SURCHARGE,
      volumeCharge: volumeCharge,
      packageMultiplier: packageMultipliers[formData.packageType],
      insuranceCost: insuranceCost,
      totalPrice: totalPrice,
      distance: distance,
    };
  };

  const handleChange = (e) => {
    const { id, value, checked, type } = e.target;

    if (id === "pickupLocation") {
      setFormData((prev) => ({
        ...prev,
        pickupLocation: value,
        pickupCoords: null,
      }));
      setShowPickupSuggestions(true);
    } else if (id === "deliveryLocation") {
      setFormData((prev) => ({
        ...prev,
        deliveryLocation: value,
        deliveryCoords: null,
      }));
      setShowDeliverySuggestions(true);
    } else if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        [id]: checked,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [id]: value,
      }));
    }
  };

  const handleSubmit = async () => {
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const distance = await getDistance();
      const pricing = calculatePrice(distance);
      setResult(pricing);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="container">
          <h1 className="app-title">Logistics Calculator</h1>
          <p className="app-subtitle">
            Calculate shipping costs based on distance and package details
          </p>
        </div>
      </header>

      <main className="app-main">
        <div className="container">
          <div className="grid">
            {/* Form Section */}
            <div className="form-section">
              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Shipment Details</h2>
                  <p className="card-description">
                    Enter your pickup and delivery information
                  </p>
                </div>
                <div className="card-content">
                  {/* Pickup Location */}
                  <div className="form-group">
                    <label htmlFor="pickupLocation" className="form-label">
                      Pickup Location
                    </label>
                    <div className="autocomplete-wrapper">
                      <input
                        type="text"
                        id="pickupLocation"
                        value={formData.pickupLocation}
                        maxLength={100}
                        className="form-input"
                        onChange={handleChange}
                        placeholder="Search for pickup location..."
                      />
                      {showPickupSuggestions &&
                        pickupSuggestions.length > 0 && (
                          <div className="suggestions-list">
                            {pickupSuggestions.map((suggestion, index) => (
                              <div
                                key={index}
                                className="suggestion-item"
                                onClick={() => handlePickupSelect(suggestion)}
                              >
                                {suggestion.properties.formatted}
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>

                  {/* Delivery Location */}
                  <div className="form-group">
                    <label htmlFor="deliveryLocation" className="form-label">
                      Delivery Location
                    </label>
                    <div className="autocomplete-wrapper">
                      <input
                        type="text"
                        id="deliveryLocation"
                        value={formData.deliveryLocation}
                        maxLength={100}
                        className="form-input"
                        onChange={handleChange}
                        placeholder="Search for delivery location..."
                      />
                      {showDeliverySuggestions &&
                        deliverySuggestions.length > 0 && (
                          <div className="suggestions-list">
                            {deliverySuggestions.map((suggestion, index) => (
                              <div
                                key={index}
                                className="suggestion-item"
                                onClick={() => handleDeliverySelect(suggestion)}
                              >
                                {suggestion.properties.formatted}
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h2 className="card-title">Package Information</h2>
                  <p className="card-description">
                    Specify dimensions and type
                  </p>
                </div>
                <div className="card-content">
                  {/* Dimensions */}
                  <div className="dimensions-grid">
                    <div className="form-group">
                      <label htmlFor="length" className="form-label">
                        Length (cm)
                      </label>
                      <input
                        type="number"
                        id="length"
                        value={formData.length}
                        min={10}
                        max={1000}
                        className="form-input"
                        onChange={handleChange}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="width" className="form-label">
                        Width (cm)
                      </label>
                      <input
                        type="number"
                        id="width"
                        value={formData.width}
                        min={10}
                        max={1000}
                        className="form-input"
                        onChange={handleChange}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="height" className="form-label">
                        Height (cm)
                      </label>
                      <input
                        type="number"
                        id="height"
                        value={formData.height}
                        min={10}
                        max={1000}
                        className="form-input"
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  {/* Package Type */}
                  <div className="form-group">
                    <label htmlFor="packageType" className="form-label">
                      Package Type
                    </label>
                    <select
                      id="packageType"
                      value={formData.packageType}
                      onChange={handleChange}
                      className="form-select"
                    >
                      <option value="standard">Standard</option>
                      <option value="fragile">Fragile (+50%)</option>
                      <option value="document">Document (-20%)</option>
                    </select>
                  </div>

                  {/* Insurance */}
                  <div className="checkbox-group">
                    <input
                      type="checkbox"
                      id="isInsuranceRequired"
                      checked={formData.isInsuranceRequired}
                      onChange={handleChange}
                      className="form-checkbox"
                    />
                    <label
                      htmlFor="isInsuranceRequired"
                      className="checkbox-label"
                    >
                      Add insurance coverage (+10%)
                    </label>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="btn btn-primary"
              >
                {loading ? "Calculating..." : "Calculate Shipping Cost"}
              </button>
            </div>

            {/* Results Section */}
            <div className="results-section">
              {error && (
                <div className="alert alert-error">
                  <div className="alert-content">
                    <h3 className="alert-title">Error</h3>
                    <p className="alert-message">{error}</p>
                  </div>
                </div>
              )}

              {result && (
                <div className="card">
                  <div className="card-header">
                    <h2 className="card-title">Cost Breakdown</h2>
                    <p className="card-description">
                      Detailed pricing information
                    </p>
                  </div>
                  <div className="card-content">
                    <div className="breakdown-list">
                      <div className="breakdown-item">
                        <span className="breakdown-label">Distance</span>
                        <span className="breakdown-value">
                          {result.distance.toFixed(2)} km
                        </span>
                      </div>
                      <div className="breakdown-item">
                        <span className="breakdown-label">Base Rate</span>
                        <span className="breakdown-value">
                          Rs. {result.baseRate.toFixed(2)}
                        </span>
                      </div>
                      <div className="breakdown-item">
                        <span className="breakdown-label">Distance Cost</span>
                        <span className="breakdown-value">
                          Rs. {result.distanceCost.toFixed(2)}
                        </span>
                      </div>
                      <div className="breakdown-item">
                        <span className="breakdown-label">Service Charge</span>
                        <span className="breakdown-value">
                          Rs. {result.serviceCharge.toFixed(2)}
                        </span>
                      </div>
                      <div className="breakdown-item">
                        <span className="breakdown-label">Fuel Surcharge</span>
                        <span className="breakdown-value">
                          Rs. {result.fuelSurcharge.toFixed(2)}
                        </span>
                      </div>
                      {result.volumeCharge > 0 && (
                        <div className="breakdown-item">
                          <span className="breakdown-label">Volume Charge</span>
                          <span className="breakdown-value">
                            Rs. {result.volumeCharge.toFixed(2)}
                          </span>
                        </div>
                      )}
                      {result.packageMultiplier !== 1 && (
                        <div className="breakdown-item">
                          <span className="breakdown-label">
                            Package Type Multiplier
                          </span>
                          <span className="breakdown-value">
                            {result.packageMultiplier}x
                          </span>
                        </div>
                      )}
                      {result.insuranceCost > 0 && (
                        <div className="breakdown-item">
                          <span className="breakdown-label">Insurance</span>
                          <span className="breakdown-value">
                            Rs. {result.insuranceCost.toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div className="breakdown-item breakdown-total">
                        <span className="breakdown-label-total">
                          Total Cost
                        </span>
                        <span className="breakdown-value-total">
                          Rs. {result.totalPrice.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
