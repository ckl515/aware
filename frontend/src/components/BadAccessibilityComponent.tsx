import { useState, useEffect, useRef } from 'react';

// Bad React Component with Many Accessibility Issues
const BadAccessibilityComponent = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    age: ''
  });
  const [notifications, setNotifications] = useState<string[]>([]);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-focus without proper management
    if (isModalOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isModalOpen]);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // No validation or error handling
    setNotifications([...notifications, `User ${formData.username} registered!`]);
    setIsModalOpen(false);
  };

  const tabs = [
    'Home',
    'Products', 
    'Services',
    'Contact'
  ];

  const productData = [
    { id: 1, name: 'Widget A', price: 19.99, stock: 50, image: 'https://picsum.photos/200/150?random=1' },
    { id: 2, name: 'Widget B', price: 29.99, stock: 25, image: 'https://picsum.photos/200/150?random=2' },
    { id: 3, name: 'Widget C', price: 39.99, stock: 10, image: 'https://picsum.photos/200/150?random=3' },
    { id: 4, name: 'Widget D', price: 49.99, stock: 0, image: 'https://picsum.photos/200/150?random=4' }
  ];

  // Bad color combinations for contrast issues
  const badStyles = {
    lowContrast: {
      color: '#cccccc',
      backgroundColor: '#dddddd',
      padding: '10px',
      margin: '5px 0'
    },
    veryLowContrast: {
      color: '#yellow',
      backgroundColor: '#orange',
      padding: '8px',
      fontWeight: 'bold'
    },
    invisibleText: {
      color: '#f0f0f0',
      backgroundColor: '#ffffff',
      padding: '5px'
    }
  };

  return (
    <div className="bad-accessibility-component">
      {/* Multiple H1s - accessibility violation */}
      <h1>Welcome to Our Store</h1>
      
      {/* Content not in main landmark */}
      <div style={{ padding: '20px' }}>
        
        {/* Navigation without proper semantics */}
        <div style={{ borderBottom: '1px solid #ccc', marginBottom: '20px' }}>
          {tabs.map((tab, index) => (
            <div
              key={index}
              onClick={() => setSelectedTab(index)}
              style={{
                display: 'inline-block',
                padding: '10px 15px',
                cursor: 'pointer',
                backgroundColor: selectedTab === index ? '#007bff' : '#f8f9fa',
                color: selectedTab === index ? 'white' : 'black',
                marginRight: '5px'
              }}
            >
              {tab}
            </div>
          ))}
        </div>

        {/* Tab content without proper ARIA */}
        <div style={{ minHeight: '400px' }}>
          {selectedTab === 0 && (
            <div>
              <h1>Home Section</h1> {/* Another H1 - violation */}
              
              {/* Images without alt text */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '15px', margin: '20px 0' }}>
                <img src="https://picsum.photos/300/200?random=10" style={{ width: '100%' }} />
                <img src="https://picsum.photos/300/200?random=11" style={{ width: '100%' }} />
                <img src="https://picsum.photos/300/200?random=12" style={{ width: '100%' }} />
              </div>

              {/* Low contrast text */}
              <p style={badStyles.lowContrast}>
                This text has very poor contrast and is difficult to read for users with visual impairments.
              </p>
              
              <p style={badStyles.veryLowContrast}>
                This text is even worse for accessibility!
              </p>

              {/* Links without proper descriptions */}
              <p>
                <span 
                  onClick={() => setSelectedTab(1)}
                  style={{ color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}
                >
                  Click here
                </span> to see our products or{' '}
                <span 
                  onClick={() => setIsModalOpen(true)}
                  style={{ color: 'blue', textDecoration: 'underline', cursor: 'pointer' }}
                >
                  click here
                </span> to register.
              </p>

              {/* Button without accessible name */}
              <button onClick={() => setIsModalOpen(true)} style={{ fontSize: '24px', border: 'none', background: 'none' }}>
                🛒
              </button>

              {/* Auto-playing media */}
              <video autoPlay muted loop style={{ width: '100%', height: '200px', margin: '20px 0' }}>
                <source src="https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4" type="video/mp4" />
              </video>
            </div>
          )}

          {selectedTab === 1 && (
            <div>
              <h1>Our Products</h1>
              
              {/* Table without headers */}
              <table style={{ width: '100%', borderCollapse: 'collapse', margin: '20px 0' }}>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>Product</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>Price</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>Stock</td>
                  <td style={{ padding: '10px', border: '1px solid #ddd' }}>Action</td>
                </tr>
                {productData.map(product => (
                  <tr key={product.id}>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                      <img src={product.image} style={{ width: '50px', height: '50px', marginRight: '10px' }} />
                      {product.name}
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>${product.price}</td>
                    <td style={{ 
                      padding: '10px', 
                      border: '1px solid #ddd',
                      color: product.stock === 0 ? 'red' : 'green' // Color-only indication
                    }}>
                      {product.stock === 0 ? 'Out of Stock' : product.stock}
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>
                      <button 
                        disabled={product.stock === 0}
                        onClick={() => alert(`Added ${product.name} to cart`)}
                      >
                        Add to Cart
                      </button>
                    </td>
                  </tr>
                ))}
              </table>

              {/* Custom dropdown without accessibility */}
              <div style={{ margin: '20px 0' }}>
                <div style={{ marginBottom: '10px' }}>Sort by:</div>
                <div 
                  onClick={() => {/* No functionality */}}
                  style={{
                    border: '1px solid #ccc',
                    padding: '8px',
                    cursor: 'pointer',
                    backgroundColor: 'white',
                    width: '200px'
                  }}
                >
                  Price (Low to High) ▼
                </div>
              </div>
            </div>
          )}

          {selectedTab === 2 && (
            <div>
              <h1>Our Services</h1>
              
              {/* List implemented as divs */}
              <div style={{ margin: '20px 0' }}>
                <h3>What we offer:</h3>
                <div style={{ marginLeft: '20px' }}>
                  <div>• Custom widget design</div>
                  <div>• Widget repair services</div>
                  <div>• Widget consulting</div>
                  <div>• 24/7 widget support</div>
                </div>
              </div>

              {/* Iframe without title */}
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3024.123!2d-74.006!3d40.713!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDDCsDQyJzQ3LjciTiA3NMKwMDAnMjEuNiJX!5e0!3m2!1sen!2sus!4v1234567890!5m2!1sen!2sus"
                width="100%" 
                height="300"
                style={{ border: 0, margin: '20px 0' }}
              />

              {/* Missing heading hierarchy */}
              <h5>Service Areas</h5>
              <p>We serve customers worldwide with our premium widget services.</p>
            </div>
          )}

          {selectedTab === 3 && (
            <div>
              <h1>Contact Us</h1>
              
              {/* Form with accessibility issues */}
              <form onSubmit={handleFormSubmit} style={{ maxWidth: '400px' }}>
                {/* Inputs without proper labels */}
                <div style={{ marginBottom: '15px' }}>
                  <input 
                    type="text"
                    placeholder="Full Name"
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc' }}
                  />
                </div>
                
                <div style={{ marginBottom: '15px' }}>
                  <input 
                    type="email"
                    placeholder="email@example.com"
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc' }}
                  />
                </div>

                {/* Required field without indication */}
                <div style={{ marginBottom: '15px' }}>
                  <input 
                    type="tel"
                    placeholder="Phone Number"
                    required
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc' }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <textarea 
                    placeholder="Your message..."
                    rows={4}
                    style={{ width: '100%', padding: '8px', border: '1px solid #ccc', resize: 'vertical' }}
                  />
                </div>

                <button type="submit" style={{ 
                  backgroundColor: '#007bff', 
                  color: 'white', 
                  border: 'none', 
                  padding: '10px 20px',
                  cursor: 'pointer'
                }}>
                  Send Message
                </button>
              </form>

              {/* Social media links without accessible names */}
              <div style={{ margin: '30px 0' }}>
                <h3>Follow Us:</h3>
                <div style={{ display: 'flex', gap: '15px' }}>
                  <span onClick={() => window.open('https://facebook.com')} style={{ cursor: 'pointer', fontSize: '24px' }}>📘</span>
                  <span onClick={() => window.open('https://twitter.com')} style={{ cursor: 'pointer', fontSize: '24px' }}>🐦</span>
                  <span onClick={() => window.open('https://instagram.com')} style={{ cursor: 'pointer', fontSize: '24px' }}>📷</span>
                  <span onClick={() => window.open('https://linkedin.com')} style={{ cursor: 'pointer', fontSize: '24px' }}>💼</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notifications without proper ARIA */}
        {notifications.length > 0 && (
          <div style={{ 
            position: 'fixed', 
            top: '20px', 
            right: '20px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            padding: '15px',
            borderRadius: '4px',
            maxWidth: '300px'
          }}>
            {notifications[notifications.length - 1]}
            <button 
              onClick={() => setNotifications([])}
              style={{ 
                marginLeft: '10px', 
                background: 'none', 
                border: 'none', 
                color: 'white', 
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Modal without proper focus management */}
        {isModalOpen && (
          <>
            <div 
              onClick={() => setIsModalOpen(false)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0,0,0,0.5)',
                zIndex: 999
              }}
            />
            <div 
              ref={modalRef}
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                backgroundColor: 'white',
                padding: '30px',
                borderRadius: '8px',
                zIndex: 1000,
                minWidth: '400px'
              }}
            >
              <h2>Quick Registration</h2>
              
              <form onSubmit={handleFormSubmit}>
                {/* Form without proper labels */}
                <input 
                  type="text"
                  placeholder="Username"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  style={{ width: '100%', padding: '8px', margin: '8px 0', border: '1px solid #ccc' }}
                />
                
                <input 
                  type="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})}
                  style={{ width: '100%', padding: '8px', margin: '8px 0', border: '1px solid #ccc' }}
                />
                
                <input 
                  type="email"
                  placeholder="Email Address"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  style={{ width: '100%', padding: '8px', margin: '8px 0', border: '1px solid #ccc' }}
                />
                
                <input 
                  type="number"
                  placeholder="Age"
                  value={formData.age}
                  onChange={(e) => setFormData({...formData, age: e.target.value})}
                  style={{ width: '100%', padding: '8px', margin: '8px 0', border: '1px solid #ccc' }}
                />

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    style={{ padding: '10px 20px', border: '1px solid #ccc', backgroundColor: 'white', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    style={{ padding: '10px 20px', border: 'none', backgroundColor: '#007bff', color: 'white', cursor: 'pointer' }}
                  >
                    Register
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default BadAccessibilityComponent;